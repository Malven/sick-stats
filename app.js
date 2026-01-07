// ===========================
// Data Management
// ===========================

let personnelData = [];
let searchFilter = '';
let leaveTypeFilter = 'all';
let roleFilter = 'all';

// Generate unique ID
function generateId() {
  return 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Load data from localStorage
function loadData() {
  try {
    const stored = localStorage.getItem('personnelData');
    if (stored) {
      personnelData = JSON.parse(stored);
      // Migration: Add type field to existing records without it
      personnelData.forEach(person => {
        if (person.sicknessRecords) {
          person.sicknessRecords.forEach(record => {
            if (!record.type) {
              record.type = 'sick';
            }
          });
        }
      });
      saveData(); // Save migrated data
    } else {
      personnelData = [];
    }
  } catch (error) {
    console.error('Fel vid inläsning av data från localStorage:', error);
    alert('Fel vid inläsning av data. Startar med tomma poster.');
    personnelData = [];
  }
}

// Save data to localStorage
function saveData() {
  try {
    localStorage.setItem('personnelData', JSON.stringify(personnelData));
  } catch (error) {
    console.error('Fel vid sparande av data till localStorage:', error);
    alert(
      'Fel vid sparande av data. Vänligen kontrollera dina webbläsarinställningar.'
    );
  }
}

// ===========================
// Personnel CRUD Operations
// ===========================

// Add new personnel
function addPersonnel(name, role) {
  const person = {
    id: generateId(),
    name: name.trim(),
    role: role.trim(),
    sicknessRecords: []
  };
  personnelData.push(person);
  saveData();
  return person;
}

// Update personnel
function updatePersonnel(id, name, role) {
  const person = personnelData.find(p => p.id === id);
  if (person) {
    person.name = name.trim();
    person.role = role.trim();
    saveData();
    return person;
  }
  return null;
}

// Delete personnel
function deletePersonnel(id) {
  const index = personnelData.findIndex(p => p.id === id);
  if (index !== -1) {
    personnelData.splice(index, 1);
    saveData();
    return true;
  }
  return false;
}

// Get personnel by ID
function getPersonnelById(id) {
  return personnelData.find(p => p.id === id);
}

// ===========================
// Leave Tracking
// ===========================

// Check if a leave record is currently active
function isLeaveActive(record) {
  if (!record) return false;

  const today = new Date().toISOString().split('T')[0];
  const startDateStr = record.startDate;

  // If start date is in the future, it's not active yet (compare as strings)
  if (startDateStr > today) return false;

  // If no end date, it's active (sick/VAB) - started and not ended
  if (record.endDate === null) return true;

  // If has end date, check if today is between start and end (compare as strings)
  const endDateStr = record.endDate;
  return today >= startDateStr && today <= endDateStr;
}

// Register leave (sick, VAB, or parental)
function registerLeave(
  personId,
  type,
  startDate,
  endDate = null,
  comment = ''
) {
  const person = getPersonnelById(personId);
  if (!person) return false;

  // Check if there's already an active leave period
  const hasActivePeriod = person.sicknessRecords.some(record =>
    isLeaveActive(record)
  );
  if (hasActivePeriod) {
    alert(
      'Denna person har redan en aktiv frånvaroperiod. Vänligen avsluta den innan du registrerar en ny.'
    );
    return false;
  }

  // Validate end date for parental leave
  if (type === 'parental') {
    if (!endDate) {
      alert('Slutdatum krävs för föräldraledighet.');
      return false;
    }
    if (new Date(endDate) < new Date(startDate)) {
      alert('Slutdatum kan inte vara tidigare än startdatum.');
      return false;
    }
  }

  const record = {
    startDate: startDate,
    endDate: endDate,
    comment: comment.trim(),
    type: type
  };

  person.sicknessRecords.push(record);
  saveData();
  return true;
}

// Register return to work
function registerReturn(personId, returnDate) {
  const person = getPersonnelById(personId);
  if (!person) return false;

  // Find the active leave record
  const activeRecord = person.sicknessRecords.find(record =>
    isLeaveActive(record)
  );
  if (!activeRecord) {
    alert('Ingen aktiv frånvaroperiod hittades för denna person.');
    return false;
  }

  // Calculate end date as one day before return date
  // If they return on date X, their leave ended on date X-1
  const returnDateObj = new Date(returnDate);
  returnDateObj.setDate(returnDateObj.getDate() - 1);
  const endDate = returnDateObj.toISOString().split('T')[0];

  // Validate that the calculated end date is not before start date
  // This allows same-day start and end (1-day leave) when return is the day after start
  if (endDate < activeRecord.startDate) {
    alert(
      'Återgångsdatum måste vara samma dag eller senare än frånvarons startdatum.'
    );
    return false;
  }

  // Validate return date is not before start date (compare as strings YYYY-MM-DD)
  // This allows same day (for same-day start/end) or any future date
  if (returnDate < activeRecord.startDate) {
    alert('Återgångsdatum kan inte vara tidigare än frånvarons startdatum.');
    return false;
  }

  // Set the end date (this works for all leave types)
  activeRecord.endDate = endDate;
  saveData();
  return true;
}

// Calculate sick days (inclusive)
function calculateSickDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1; // Inclusive (both start and end dates count)
}

// Get current leave status
function getCurrentLeaveStatus(person) {
  const activeRecord = person.sicknessRecords.find(record =>
    isLeaveActive(record)
  );
  return activeRecord;
}

// Get leave counts
function getLeaveCounts() {
  const counts = { sick: 0, vab: 0, parental: 0, total: 0 };
  personnelData.forEach(person => {
    const currentLeave = getCurrentLeaveStatus(person);
    if (currentLeave) {
      counts.total++;
      if (currentLeave.type === 'sick') {
        counts.sick++;
      } else if (currentLeave.type === 'vab') {
        counts.vab++;
      } else if (currentLeave.type === 'parental') {
        counts.parental++;
      }
    }
  });
  return counts;
}

// ===========================
// Chart Data Functions
// ===========================

// Check if a leave record was active on a specific date
function wasLeaveActiveOnDate(record, dateStr) {
  if (!record) return false;

  const startDateStr = record.startDate;

  // If start date is after the target date, it's not active
  if (startDateStr > dateStr) return false;

  // If no end date, check if date is on or after start date and not in the future
  if (record.endDate === null) {
    const today = new Date().toISOString().split('T')[0];
    return dateStr >= startDateStr && dateStr <= today;
  }

  // If has end date, check if date falls between start and end (inclusive)
  const endDateStr = record.endDate;
  return dateStr >= startDateStr && dateStr <= endDateStr;
}

// Get 30-day rolling data for chart
function get30DayRollingData() {
  const dates = [];
  const sick = [];
  const vab = [];
  const parental = [];

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Generate dates for the last 30 days
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    dates.push(dateStr);

    // Count personnel with active leave on this date
    let sickCount = 0;
    let vabCount = 0;
    let parentalCount = 0;

    personnelData.forEach(person => {
      if (person.sicknessRecords) {
        person.sicknessRecords.forEach(record => {
          if (wasLeaveActiveOnDate(record, dateStr)) {
            if (record.type === 'sick') {
              sickCount++;
            } else if (record.type === 'vab') {
              vabCount++;
            } else if (record.type === 'parental') {
              parentalCount++;
            }
          }
        });
      }
    });

    sick.push(sickCount);
    vab.push(vabCount);
    parental.push(parentalCount);
  }

  return { dates, sick, vab, parental };
}

// Get total sick days per personnel
function getTotalSickDaysPerPersonnel() {
  const result = [];

  personnelData.forEach(person => {
    let totalSickDays = 0;

    if (person.sicknessRecords) {
      person.sicknessRecords.forEach(record => {
        // Only count records with type === 'sick'
        if (record.type === 'sick') {
          if (record.endDate) {
            // Closed record - calculate days
            totalSickDays += calculateSickDays(
              record.startDate,
              record.endDate
            );
          } else {
            // Open record - calculate days up to today
            const today = new Date().toISOString().split('T')[0];
            totalSickDays += calculateSickDays(record.startDate, today);
          }
        }
      });
    }

    if (totalSickDays > 0 || result.length === 0) {
      result.push({
        name: person.name,
        days: totalSickDays
      });
    }
  });

  // Sort by days descending
  result.sort((a, b) => b.days - a.days);

  return result;
}

// ===========================
// UI Rendering
// ===========================

// Render all personnel
function renderPersonnelList() {
  const container = document.getElementById('personnel-list');
  const emptyState = document.getElementById('empty-state');

  // Update role filter options before filtering
  updateRoleFilterOptions();

  // Filter personnel based on search term and filters
  const filteredPersonnel = filterPersonnel(
    personnelData,
    searchFilter,
    leaveTypeFilter,
    roleFilter
  );

  if (filteredPersonnel.length === 0) {
    container.innerHTML = '';
    if (personnelData.length === 0) {
      emptyState.classList.remove('hidden');
    } else {
      emptyState.classList.add('hidden');
      // Show message when search/filters return no results
      container.innerHTML =
        '<div class="empty-state"><p>Inga resultat hittades för din sökning/filter.</p></div>';
    }
    return;
  }

  emptyState.classList.add('hidden');
  container.innerHTML = '';

  filteredPersonnel.forEach(person => {
    const card = createPersonnelCard(person);
    container.appendChild(card);
  });

  updateSummary();
}

// Filter personnel by search term (name or role)
function filterPersonnel(personnel, searchTerm, leaveTypeFilter, roleFilter) {
  let filtered = personnel;

  // Apply search filter
  if (searchTerm && searchTerm.trim() !== '') {
    const term = searchTerm.toLowerCase().trim();
    filtered = filtered.filter(person => {
      const nameMatch = person.name.toLowerCase().includes(term);
      const roleMatch = person.role && person.role.toLowerCase().includes(term);
      return nameMatch || roleMatch;
    });
  }

  // Apply leave type filter
  if (leaveTypeFilter && leaveTypeFilter !== 'all') {
    filtered = filtered.filter(person => {
      const currentLeave = getCurrentLeaveStatus(person);
      if (leaveTypeFilter === 'at-work') {
        return !currentLeave;
      } else {
        return currentLeave && currentLeave.type === leaveTypeFilter;
      }
    });
  }

  // Apply role filter
  const distinctRoles = getDistinctRoles();
  if (roleFilter && roleFilter !== 'all') {
    filtered = filtered.filter(person => {
      // If person has no role, only show if no distinct roles exist
      if (!person.role || person.role.trim() === '') {
        return distinctRoles.length === 0;
      }
      return person.role.trim() === roleFilter;
    });
  }
  // When filter is 'all' or no distinct roles exist, show everyone (including those without roles)
  // This is the default behavior, so no additional filtering needed

  return filtered;
}

// Get distinct role values from personnel data
function getDistinctRoles() {
  const roles = new Set();
  personnelData.forEach(person => {
    if (person.role && person.role.trim() !== '') {
      roles.add(person.role.trim());
    }
  });
  return Array.from(roles).sort();
}

// Check if role filter should be shown
function shouldShowRoleFilter() {
  return getDistinctRoles().length > 0;
}

// Update role filter options based on available roles
function updateRoleFilterOptions() {
  const roleFilterSelect = document.getElementById('role-filter');
  const distinctRoles = getDistinctRoles();

  if (distinctRoles.length > 0) {
    // Show the filter
    roleFilterSelect.style.display = 'block';

    // Use roleFilter as source of truth for current selection
    const currentValue = roleFilter;

    // Clear existing options except "Alla Roller"
    roleFilterSelect.innerHTML = '<option value="all">Alla områden</option>';

    // Add distinct roles as options
    distinctRoles.forEach(role => {
      const option = document.createElement('option');
      option.value = role;
      option.textContent = role;
      roleFilterSelect.appendChild(option);
    });

    // Restore the selection if it's still valid, otherwise reset to 'all'
    if (currentValue === 'all' || distinctRoles.includes(currentValue)) {
      roleFilterSelect.value = currentValue;
    } else {
      roleFilter = 'all';
      roleFilterSelect.value = 'all';
    }
  } else {
    // Hide the filter and reset to 'all'
    roleFilterSelect.style.display = 'none';
    roleFilter = 'all';
    roleFilterSelect.value = 'all';
  }
}

// Create personnel card
function createPersonnelCard(person) {
  const card = document.createElement('div');
  const currentLeave = getCurrentLeaveStatus(person);
  const hasLeave = currentLeave !== undefined;

  // Determine card class and status badge based on leave type
  let cardClass = 'at-work';
  let statusText = 'På Jobbet';
  let statusBadgeClass = 'at-work';
  let leaveInfoLabel = '';
  let leaveTypeLabel = '';

  if (hasLeave) {
    if (currentLeave.type === 'sick') {
      cardClass = 'sick';
      statusText = 'Sjuk';
      statusBadgeClass = 'sick';
      leaveInfoLabel = 'Sjuk sedan:';
      leaveTypeLabel = 'Antal dagar sjuk:';
    } else if (currentLeave.type === 'vab') {
      cardClass = 'vab';
      statusText = 'VAB';
      statusBadgeClass = 'vab';
      leaveInfoLabel = 'VAB sedan:';
      leaveTypeLabel = 'Antal dagar VAB:';
    } else if (currentLeave.type === 'parental') {
      cardClass = 'parental';
      statusText = 'Föräldraledig';
      statusBadgeClass = 'parental';
      leaveInfoLabel = 'Föräldraledig från:';
      leaveTypeLabel = 'Antal dagar:';
    }
  }

  card.className = `personnel-card ${cardClass}`;

  let leaveInfoHTML = '';
  if (hasLeave) {
    const today = new Date().toISOString().split('T')[0];
    // For active leave, calculate days up to today (or end date if it's in the past)
    let calculationEndDate = today;
    if (currentLeave.endDate) {
      const endDateObj = new Date(currentLeave.endDate);
      const todayObj = new Date(today);
      // Use the earlier of today or end date
      calculationEndDate = endDateObj < todayObj ? currentLeave.endDate : today;
    }
    const days = calculateSickDays(currentLeave.startDate, calculationEndDate);

    // Check if warning is needed for sick leave >= 7 days
    const showWarning = currentLeave.type === 'sick' && days >= 7;

    // Check if end date is in the future and show return date
    let returnDateHTML = '';
    if (currentLeave.endDate) {
      const endDateStr = currentLeave.endDate;
      if (endDateStr > today) {
        // Calculate return date (day after end date)
        const endDateObj = new Date(endDateStr);
        endDateObj.setDate(endDateObj.getDate() + 1);
        const returnDate = endDateObj.toISOString().split('T')[0];
        returnDateHTML = `<p><strong>Åter:</strong> ${formatDate(
          returnDate
        )}</p>`;
      }
    }

    leaveInfoHTML = `
            <div class="leave-info current ${currentLeave.type}">
                <p><strong>${leaveInfoLabel}</strong> ${formatDate(
      currentLeave.startDate
    )}</p>
                ${
                  currentLeave.endDate && currentLeave.type === 'parental'
                    ? `<p><strong>Föräldraledig till:</strong> ${formatDate(
                        currentLeave.endDate
                      )}</p>`
                    : ''
                }
                ${returnDateHTML}
                <p><strong>${leaveTypeLabel}</strong> ${days}</p>
                ${
                  showWarning
                    ? `<p class="warning"><strong>⚠️ Varning:</strong> Läkarintyg krävs efter 7 dagar</p>`
                    : ''
                }
                ${
                  currentLeave.comment
                    ? `<p><strong>Kommentar:</strong> ${escapeHtml(
                        currentLeave.comment
                      )}</p>`
                    : ''
                }
            </div>
        `;
  }

  // Show leave history (closed/inactive records only)
  const closedRecords = person.sicknessRecords.filter(r => !isLeaveActive(r));
  let historyHTML = '';
  if (closedRecords.length > 0) {
    const historyItems = closedRecords
      .slice(-3)
      .reverse()
      .map(record => {
        // Only calculate days and format end date if endDate exists
        let days = 0;
        let endDateDisplay = '';
        if (record.endDate) {
          days = calculateSickDays(record.startDate, record.endDate);
          endDateDisplay = ` - ${formatDate(record.endDate)}`;
        } else {
          // This shouldn't happen for closed records, but handle it gracefully
          const today = new Date().toISOString().split('T')[0];
          days = calculateSickDays(record.startDate, today);
          endDateDisplay = ` - ${formatDate(today)}`;
        }
        const typeLabel =
          record.type === 'sick'
            ? 'Sjuk'
            : record.type === 'vab'
            ? 'VAB'
            : record.type === 'parental'
            ? 'Föräldraledig'
            : 'Frånvaro';
        return `
                <div class="history-item">
                    ${typeLabel}: ${formatDate(
          record.startDate
        )}${endDateDisplay} (${days} dagar)
                    ${
                      record.comment
                        ? `<br><em>${escapeHtml(record.comment)}</em>`
                        : ''
                    }
                </div>
            `;
      })
      .join('');

    historyHTML = `
            <div class="sickness-history">
                <h4>Senaste Historik (${closedRecords.length} totalt)</h4>
                ${historyItems}
            </div>
        `;
  }

  card.innerHTML = `
        <div class="personnel-header">
            <div class="personnel-info">
                <h3>${escapeHtml(person.name)}</h3>
                ${
                  person.role
                    ? `<div class="role">${escapeHtml(person.role)}</div>`
                    : ''
                }
            </div>
            <span class="status-badge ${statusBadgeClass}">
                ${statusText}
            </span>
        </div>
        ${leaveInfoHTML}
        ${historyHTML}
        <div class="personnel-actions">
            ${
              !hasLeave
                ? `<button class="btn btn-small btn-primary register-leave-btn" data-id="${person.id}">Registrera Frånvaro</button>`
                : ''
            }
            ${
              hasLeave
                ? `<button class="btn btn-small btn-success mark-return-btn" data-id="${person.id}">Återgång till Arbete</button>`
                : ''
            }
            <button class="btn btn-small btn-secondary edit-btn" data-id="${
              person.id
            }">Redigera</button>
            <button class="btn btn-small btn-danger delete-btn" data-id="${
              person.id
            }">Ta Bort</button>
        </div>
    `;

  return card;
}

// Update summary
function updateSummary() {
  const counts = getLeaveCounts();
  document.getElementById('sick-count').textContent = counts.sick;
  document.getElementById('vab-count').textContent = counts.vab;
  document.getElementById('parental-count').textContent = counts.parental;
  document.getElementById('total-absent').textContent = counts.total;
}

// ===========================
// Modal Management
// ===========================

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  modal.classList.add('active');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  modal.classList.remove('active');
}

function closeAllModals() {
  document.querySelectorAll('.modal').forEach(modal => {
    modal.classList.remove('active');
  });
}

// ===========================
// Event Handlers
// ===========================

// Add Personnel
function handleAddPersonnel() {
  document.getElementById('personnel-modal-title').textContent =
    'Lägg till Personal';
  document.getElementById('personnel-form').reset();
  document.getElementById('personnel-id').value = '';
  openModal('personnel-modal');
}

// Edit Personnel
function handleEditPersonnel(personId) {
  const person = getPersonnelById(personId);
  if (!person) return;

  document.getElementById('personnel-modal-title').textContent =
    'Redigera Personal';
  document.getElementById('personnel-id').value = person.id;
  document.getElementById('personnel-name').value = person.name;
  document.getElementById('personnel-role').value = person.role;
  openModal('personnel-modal');
}

// Save Personnel (Add or Edit)
function handleSavePersonnel(event) {
  event.preventDefault();

  const name = document.getElementById('personnel-name').value.trim();
  const role = document.getElementById('personnel-role').value.trim();
  const id = document.getElementById('personnel-id').value;

  if (!name) {
    alert('Namn krävs.');
    return;
  }

  if (id) {
    // Edit existing
    updatePersonnel(id, name, role);
  } else {
    // Add new
    addPersonnel(name, role);
  }

  closeModal('personnel-modal');
  renderPersonnelList();
}

// Delete Personnel
function handleDeletePersonnel(personId) {
  const person = getPersonnelById(personId);
  if (!person) return;

  document.getElementById('delete-person-id').value = person.id;
  document.getElementById('delete-person-name').textContent = person.name;
  openModal('delete-modal');
}

// Confirm Delete
function handleConfirmDelete() {
  const personId = document.getElementById('delete-person-id').value;
  deletePersonnel(personId);
  closeModal('delete-modal');
  renderPersonnelList();
}

// Register Leave
function handleRegisterLeave(personId) {
  const person = getPersonnelById(personId);
  if (!person) return;

  document.getElementById('leave-person-id').value = person.id;
  document.getElementById('leave-person-name').value = person.name;
  document.getElementById('leave-start-date').value = new Date()
    .toISOString()
    .split('T')[0];
  document.getElementById('leave-comment').value = '';
  document.getElementById('leave-type').value = 'sick';
  document.getElementById('leave-end-date').value = '';

  // Toggle end date field visibility
  toggleEndDateField();

  openModal('leave-modal');
}

// Toggle end date field based on leave type
function toggleEndDateField() {
  const leaveType = document.getElementById('leave-type').value;
  const endDateGroup = document.getElementById('leave-end-date-group');
  const endDateInput = document.getElementById('leave-end-date');

  if (leaveType === 'parental') {
    endDateGroup.style.display = 'block';
    endDateInput.required = true;
  } else {
    endDateGroup.style.display = 'none';
    endDateInput.required = false;
    endDateInput.value = '';
  }
}

// Save Leave
function handleSaveLeave(event) {
  event.preventDefault();

  const personId = document.getElementById('leave-person-id').value;
  const type = document.getElementById('leave-type').value;
  const startDate = document.getElementById('leave-start-date').value;
  const endDate = document.getElementById('leave-end-date').value;
  const comment = document.getElementById('leave-comment').value;

  if (!startDate) {
    alert('Startdatum krävs.');
    return;
  }

  if (type === 'parental' && !endDate) {
    alert('Slutdatum krävs för föräldraledighet.');
    return;
  }

  if (registerLeave(personId, type, startDate, endDate || null, comment)) {
    closeModal('leave-modal');
    renderPersonnelList();
  }
}

// Mark Return
function handleMarkReturn(personId) {
  const person = getPersonnelById(personId);
  if (!person) return;

  const currentLeave = getCurrentLeaveStatus(person);
  if (!currentLeave) {
    alert('Ingen öppen frånvaroperiod hittades.');
    return;
  }

  const returnDateInput = document.getElementById('return-date');
  document.getElementById('return-person-id').value = person.id;
  document.getElementById('return-person-name').value = person.name;
  returnDateInput.value = new Date().toISOString().split('T')[0];
  returnDateInput.min = currentLeave.startDate;
  // Explicitly allow future dates by setting max to a far future date
  const farFutureDate = new Date();
  farFutureDate.setFullYear(farFutureDate.getFullYear() + 10);
  returnDateInput.max = farFutureDate.toISOString().split('T')[0];
  openModal('return-modal');
}

// Save Return
function handleSaveReturn(event) {
  event.preventDefault();

  const personId = document.getElementById('return-person-id').value;
  const returnDateInput = document.getElementById('return-date');
  const returnDate = returnDateInput.value;

  if (!returnDate) {
    alert('Återgångsdatum krävs.');
    return;
  }

  // Check if the date input has a validation error
  if (!returnDateInput.validity.valid) {
    alert('Ogiltigt datum. Vänligen välj ett giltigt datum.');
    return;
  }

  if (registerReturn(personId, returnDate)) {
    closeModal('return-modal');
    renderPersonnelList();
  }
}

// ===========================
// Utility Functions
// ===========================

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ===========================
// Chart Initialization
// ===========================

let rollingChart = null;
let sickDaysChart = null;

// Initialize 30-day rolling chart
function init30DayChart(canvasElement) {
  const data = get30DayRollingData();

  // Format dates for display (short format)
  const formattedDates = data.dates.map(dateStr => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' });
  });

  const ctx = canvasElement.getContext('2d');

  // Destroy existing chart if it exists
  if (rollingChart) {
    rollingChart.destroy();
  }

  rollingChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: formattedDates,
      datasets: [
        {
          label: 'Sjuk',
          data: data.sick,
          borderColor: '#ff6b9d',
          backgroundColor: 'rgba(255, 107, 157, 0.1)',
          tension: 0.4,
          fill: true
        },
        {
          label: 'VAB',
          data: data.vab,
          borderColor: '#ffc107',
          backgroundColor: 'rgba(255, 193, 7, 0.1)',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Föräldraledig',
          data: data.parental,
          borderColor: '#9c27b0',
          backgroundColor: 'rgba(156, 39, 176, 0.1)',
          tension: 0.4,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: '#ffffff',
            usePointStyle: true,
            padding: 15,
            font: {
              size: 12,
              weight: '600'
            }
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: 'rgba(26, 26, 26, 0.95)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          borderColor: '#2a2a2a',
          borderWidth: 1,
          padding: 12
        }
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(255, 255, 255, 0.05)',
            drawBorder: false
          },
          ticks: {
            color: '#b0b0b0',
            maxRotation: 45,
            minRotation: 45
          }
        },
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(255, 255, 255, 0.05)',
            drawBorder: false
          },
          ticks: {
            color: '#b0b0b0',
            stepSize: 1,
            precision: 0
          }
        }
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      }
    }
  });
}

// Initialize sick days per personnel chart
function initSickDaysChart(canvasElement) {
  const data = getTotalSickDaysPerPersonnel();

  // Limit to top 20 to avoid overcrowding
  const displayData = data.slice(0, 20);

  const ctx = canvasElement.getContext('2d');

  // Destroy existing chart if it exists
  if (sickDaysChart) {
    sickDaysChart.destroy();
  }

  sickDaysChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: displayData.map(item => item.name),
      datasets: [
        {
          label: 'Sjukdagar',
          data: displayData.map(item => item.days),
          backgroundColor: '#ff6b9d',
          borderColor: '#ff4081',
          borderWidth: 1
        }
      ]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(26, 26, 26, 0.95)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          borderColor: '#2a2a2a',
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: function (context) {
              return context.parsed.x + ' dagar';
            }
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: {
            color: 'rgba(255, 255, 255, 0.05)',
            drawBorder: false
          },
          ticks: {
            color: '#b0b0b0',
            stepSize: 1,
            precision: 0
          }
        },
        y: {
          grid: {
            display: false,
            drawBorder: false
          },
          ticks: {
            color: '#b0b0b0'
          }
        }
      }
    }
  });
}

// Initialize all charts
function initCharts() {
  const rollingCanvas = document.getElementById('rolling-chart');
  const sickDaysCanvas = document.getElementById('sick-days-chart');

  if (rollingCanvas) {
    init30DayChart(rollingCanvas);
  }

  if (sickDaysCanvas) {
    initSickDaysChart(sickDaysCanvas);
  }

  // Update summary on charts page too
  updateSummary();
}

// ===========================
// Event Listeners
// ===========================

document.addEventListener('DOMContentLoaded', () => {
  // Load data
  loadData();

  // Check if we're on the charts page
  const rollingChartCanvas = document.getElementById('rolling-chart');
  const sickDaysChartCanvas = document.getElementById('sick-days-chart');

  if (rollingChartCanvas || sickDaysChartCanvas) {
    // We're on the charts page
    initCharts();
    return;
  }

  // We're on the main page
  renderPersonnelList();

  // Add Personnel button
  const addPersonnelBtn = document.getElementById('add-personnel-btn');
  if (addPersonnelBtn) {
    addPersonnelBtn.addEventListener('click', handleAddPersonnel);
  }

  // Search input
  const searchInput = document.getElementById('personnel-search');
  if (searchInput) {
    searchInput.addEventListener('input', e => {
      searchFilter = e.target.value;
      renderPersonnelList();
    });
  }

  // Leave type filter
  const leaveTypeFilterEl = document.getElementById('leave-type-filter');
  if (leaveTypeFilterEl) {
    leaveTypeFilterEl.addEventListener('change', e => {
      leaveTypeFilter = e.target.value;
      renderPersonnelList();
    });
  }

  // Role filter
  const roleFilterEl = document.getElementById('role-filter');
  if (roleFilterEl) {
    roleFilterEl.addEventListener('change', e => {
      roleFilter = e.target.value;
      renderPersonnelList();
    });
  }

  // Personnel form
  const personnelForm = document.getElementById('personnel-form');
  if (personnelForm) {
    personnelForm.addEventListener('submit', handleSavePersonnel);
  }

  // Leave form
  const leaveForm = document.getElementById('leave-form');
  if (leaveForm) {
    leaveForm.addEventListener('submit', handleSaveLeave);
  }

  // Leave type change handler
  const leaveTypeEl = document.getElementById('leave-type');
  if (leaveTypeEl) {
    leaveTypeEl.addEventListener('change', toggleEndDateField);
  }

  // Return form
  const returnForm = document.getElementById('return-form');
  if (returnForm) {
    returnForm.addEventListener('submit', handleSaveReturn);
  }

  // Delete confirmation
  const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', handleConfirmDelete);
  }

  // Close buttons
  document.querySelectorAll('.close-btn, .cancel-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const modal = e.target.closest('.modal');
      if (modal) {
        closeModal(modal.id);
      }
    });
  });

  // Close modal on background click
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', e => {
      if (e.target === modal) {
        closeModal(modal.id);
      }
    });
  });

  // Event delegation for dynamic buttons
  const personnelList = document.getElementById('personnel-list');
  if (personnelList) {
    personnelList.addEventListener('click', e => {
      if (e.target.classList.contains('edit-btn')) {
        const personId = e.target.dataset.id;
        handleEditPersonnel(personId);
      } else if (e.target.classList.contains('delete-btn')) {
        const personId = e.target.dataset.id;
        handleDeletePersonnel(personId);
      } else if (e.target.classList.contains('register-leave-btn')) {
        const personId = e.target.dataset.id;
        handleRegisterLeave(personId);
      } else if (e.target.classList.contains('mark-return-btn')) {
        const personId = e.target.dataset.id;
        handleMarkReturn(personId);
      }
    });
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeAllModals();
    }
  });
});

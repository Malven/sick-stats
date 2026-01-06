// ===========================
// Data Management
// ===========================

let personnelData = [];

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
    } else {
      personnelData = [];
    }
  } catch (error) {
    console.error('Error loading data from localStorage:', error);
    alert('Error loading data. Starting with empty records.');
    personnelData = [];
  }
}

// Save data to localStorage
function saveData() {
  try {
    localStorage.setItem('personnelData', JSON.stringify(personnelData));
  } catch (error) {
    console.error('Error saving data to localStorage:', error);
    alert('Error saving data. Please check your browser storage settings.');
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
// Sickness Tracking
// ===========================

// Register sick leave
function registerSickLeave(personId, startDate, comment = '') {
  const person = getPersonnelById(personId);
  if (!person) return false;

  // Check if there's already an open sick period
  const hasOpenPeriod = person.sicknessRecords.some(
    record => record.endDate === null
  );
  if (hasOpenPeriod) {
    alert(
      'This person already has an open sick period. Please close it before registering a new one.'
    );
    return false;
  }

  const record = {
    startDate: startDate,
    endDate: null,
    comment: comment.trim()
  };

  person.sicknessRecords.push(record);
  saveData();
  return true;
}

// Register return to work
function registerReturn(personId, returnDate) {
  const person = getPersonnelById(personId);
  if (!person) return false;

  // Find the open sick record
  const openRecord = person.sicknessRecords.find(
    record => record.endDate === null
  );
  if (!openRecord) {
    alert('No open sick period found for this person.');
    return false;
  }

  // Validate return date is not before start date
  if (new Date(returnDate) < new Date(openRecord.startDate)) {
    alert('Return date cannot be earlier than the sick start date.');
    return false;
  }

  openRecord.endDate = returnDate;
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

// Get current sick status
function getCurrentSickStatus(person) {
  const openRecord = person.sicknessRecords.find(
    record => record.endDate === null
  );
  return openRecord;
}

// Get sick count
function getSickCount() {
  return personnelData.filter(person => getCurrentSickStatus(person)).length;
}

// ===========================
// UI Rendering
// ===========================

// Render all personnel
function renderPersonnelList() {
  const container = document.getElementById('personnel-list');
  const emptyState = document.getElementById('empty-state');

  if (personnelData.length === 0) {
    container.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  container.innerHTML = '';

  personnelData.forEach(person => {
    const card = createPersonnelCard(person);
    container.appendChild(card);
  });

  updateSummary();
}

// Create personnel card
function createPersonnelCard(person) {
  const card = document.createElement('div');
  const currentSick = getCurrentSickStatus(person);
  const isSick = currentSick !== undefined;

  card.className = `personnel-card ${isSick ? 'sick' : 'at-work'}`;

  let sicknessInfoHTML = '';
  if (isSick) {
    const today = new Date().toISOString().split('T')[0];
    const days = calculateSickDays(currentSick.startDate, today);
    sicknessInfoHTML = `
            <div class="sickness-info current">
                <p><strong>Sick since:</strong> ${formatDate(
                  currentSick.startDate
                )}</p>
                <p><strong>Days sick:</strong> ${days}</p>
                ${
                  currentSick.comment
                    ? `<p><strong>Reason:</strong> ${escapeHtml(
                        currentSick.comment
                      )}</p>`
                    : ''
                }
            </div>
        `;
  }

  // Show sickness history (closed records)
  const closedRecords = person.sicknessRecords.filter(r => r.endDate !== null);
  let historyHTML = '';
  if (closedRecords.length > 0) {
    const historyItems = closedRecords
      .slice(-3)
      .reverse()
      .map(record => {
        const days = calculateSickDays(record.startDate, record.endDate);
        return `
                <div class="history-item">
                    ${formatDate(record.startDate)} - ${formatDate(
          record.endDate
        )} (${days} days)
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
                <h4>Recent History (${closedRecords.length} total)</h4>
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
            <span class="status-badge ${isSick ? 'sick' : 'at-work'}">
                ${isSick ? 'Sick' : 'At Work'}
            </span>
        </div>
        ${sicknessInfoHTML}
        ${historyHTML}
        <div class="personnel-actions">
            ${
              !isSick
                ? `<button class="btn btn-small btn-danger mark-sick-btn" data-id="${person.id}">Mark Sick</button>`
                : ''
            }
            ${
              isSick
                ? `<button class="btn btn-small btn-success mark-return-btn" data-id="${person.id}">Returned to Work</button>`
                : ''
            }
            <button class="btn btn-small btn-secondary edit-btn" data-id="${
              person.id
            }">Edit</button>
            <button class="btn btn-small btn-danger delete-btn" data-id="${
              person.id
            }">Delete</button>
        </div>
    `;

  return card;
}

// Update summary
function updateSummary() {
  const sickCount = getSickCount();
  document.getElementById('sick-count').textContent = sickCount;
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
    'Add Personnel';
  document.getElementById('personnel-form').reset();
  document.getElementById('personnel-id').value = '';
  openModal('personnel-modal');
}

// Edit Personnel
function handleEditPersonnel(personId) {
  const person = getPersonnelById(personId);
  if (!person) return;

  document.getElementById('personnel-modal-title').textContent =
    'Edit Personnel';
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
    alert('Name is required.');
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

// Mark Sick
function handleMarkSick(personId) {
  const person = getPersonnelById(personId);
  if (!person) return;

  document.getElementById('sick-person-id').value = person.id;
  document.getElementById('sick-person-name').value = person.name;
  document.getElementById('sick-start-date').value = new Date()
    .toISOString()
    .split('T')[0];
  document.getElementById('sick-comment').value = '';
  openModal('sick-modal');
}

// Save Sick Leave
function handleSaveSickLeave(event) {
  event.preventDefault();

  const personId = document.getElementById('sick-person-id').value;
  const startDate = document.getElementById('sick-start-date').value;
  const comment = document.getElementById('sick-comment').value;

  if (!startDate) {
    alert('Start date is required.');
    return;
  }

  if (registerSickLeave(personId, startDate, comment)) {
    closeModal('sick-modal');
    renderPersonnelList();
  }
}

// Mark Return
function handleMarkReturn(personId) {
  const person = getPersonnelById(personId);
  if (!person) return;

  const currentSick = getCurrentSickStatus(person);
  if (!currentSick) {
    alert('No open sick period found.');
    return;
  }

  document.getElementById('return-person-id').value = person.id;
  document.getElementById('return-person-name').value = person.name;
  document.getElementById('return-date').value = new Date()
    .toISOString()
    .split('T')[0];
  document.getElementById('return-date').min = currentSick.startDate;
  openModal('return-modal');
}

// Save Return
function handleSaveReturn(event) {
  event.preventDefault();

  const personId = document.getElementById('return-person-id').value;
  const returnDate = document.getElementById('return-date').value;

  if (!returnDate) {
    alert('Return date is required.');
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
  return date.toLocaleDateString('en-US', {
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
// Event Listeners
// ===========================

document.addEventListener('DOMContentLoaded', () => {
  // Load data and render
  loadData();
  renderPersonnelList();

  // Add Personnel button
  document
    .getElementById('add-personnel-btn')
    .addEventListener('click', handleAddPersonnel);

  // Personnel form
  document
    .getElementById('personnel-form')
    .addEventListener('submit', handleSavePersonnel);

  // Sick form
  document
    .getElementById('sick-form')
    .addEventListener('submit', handleSaveSickLeave);

  // Return form
  document
    .getElementById('return-form')
    .addEventListener('submit', handleSaveReturn);

  // Delete confirmation
  document
    .getElementById('confirm-delete-btn')
    .addEventListener('click', handleConfirmDelete);

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
  document.getElementById('personnel-list').addEventListener('click', e => {
    if (e.target.classList.contains('edit-btn')) {
      const personId = e.target.dataset.id;
      handleEditPersonnel(personId);
    } else if (e.target.classList.contains('delete-btn')) {
      const personId = e.target.dataset.id;
      handleDeletePersonnel(personId);
    } else if (e.target.classList.contains('mark-sick-btn')) {
      const personId = e.target.dataset.id;
      handleMarkSick(personId);
    } else if (e.target.classList.contains('mark-return-btn')) {
      const personId = e.target.dataset.id;
      handleMarkReturn(personId);
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeAllModals();
    }
  });
});

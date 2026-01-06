# Product Requirements Document (PRD)

## 1. Overview

### 1.1 Purpose

The purpose of this document is to define the requirements for a simple, client-side web application that tracks personnel sickness. The webpage will allow users to:

- Register when personnel call in sick
- Track the duration of sickness
- Record when personnel return to work
- Add, update, and remove personnel records

The application will be implemented as a single HTML page using HTML, CSS, and JavaScript, with data persistence handled via `localStorage`.

### 1.2 Scope

**In scope:**

- Personnel management (add/update/remove)
- Sickness tracking (start date, end date, duration)
- Data persistence using browser `localStorage`
- Basic, responsive UI

**Out of scope:**

- Server-side logic or databases
- Authentication or role-based access
- Reporting beyond basic summaries
- Integration with external systems

---

## 2. Target Users

- Team leaders or managers tracking staff availability
- Small organizations without dedicated HR systems
- Any user needing a lightweight, offline-capable sickness tracker

---

## 3. Functional Requirements

### 3.1 Personnel Management

#### 3.1.1 Add Personnel

- User can add a new person with the following fields:

  - Unique ID (generated automatically)
  - Full name (required)
  - Optional role/department

#### 3.1.2 Update Personnel

- User can edit existing personnel details
- Changes are immediately persisted to `localStorage`

#### 3.1.3 Remove Personnel

- User can delete personnel
- All associated sickness records are removed
- User is prompted to confirm deletion

---

### 3.2 Sickness Tracking

#### 3.2.1 Register Sick Leave

- User can mark a person as sick
- Required data:

  - Sick start date (default: today)
  - Optional comment/reason

#### 3.2.2 Update Sick Status

- User can:

  - Edit the sick start date
  - Add or update comments

#### 3.2.3 Register Return to Work

- User can mark when a person returns to work
- Required data:

  - Return date (default: today)

- System calculates:

  - Total number of sick days (inclusive or exclusive based on defined logic)

#### 3.2.4 Multiple Sick Periods

- Each personnel record can have multiple sickness periods
- Historical sickness records remain visible

---

### 3.3 Data Persistence

- All data is stored in `localStorage`
- Data is automatically loaded when the page is opened or refreshed
- No data is transmitted externally

---

## 4. Non-Functional Requirements

### 4.1 Performance

- Page load time under 1 second for up to 500 personnel records
- UI interactions should feel instantaneous

### 4.2 Usability

- Simple, clean UI with minimal learning curve
- Clear visual distinction between:

  - Currently sick personnel
  - Personnel at work

### 4.3 Compatibility

- Works in modern browsers (Chrome, Firefox, Edge, Safari)
- No external libraries required (vanilla JS)

### 4.4 Accessibility

- Semantic HTML elements
- Keyboard navigation supported
- Sufficient color contrast

---

## 5. User Interface Requirements

### 5.1 Layout

- **Header**

  - Page title
  - Optional summary (e.g., number of sick personnel today)

- **Personnel List Section**

  - Table or card-based list
  - Displays:

    - Name
    - Current status (Sick / At work)
    - Sick start date (if applicable)
    - Days sick (if applicable)
    - Action buttons (Edit, Delete, Mark Sick/Returned)

- **Forms / Modals**

  - Add/Edit Personnel
  - Register Sick Leave
  - Register Return to Work

### 5.2 Visual States

- Color-coded status indicators:

  - Red: Sick
  - Green: At work

---

## 6. Data Model (Suggested)

### 6.1 Personnel Object

```json
{
  "id": "string",
  "name": "string",
  "role": "string",
  "sicknessRecords": [
    {
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD | null",
      "comment": "string"
    }
  ]
}
```

### 6.2 localStorage Structure

- Key: `personnelData`
- Value: JSON stringified array of Personnel Objects

---

## 7. User Flows

### 7.1 Add Personnel

1. User clicks "Add Personnel"
2. Form is displayed
3. User enters details and saves
4. Personnel appears in list

### 7.2 Mark Person as Sick

1. User clicks "Mark Sick" next to personnel
2. Sick leave form opens
3. User confirms start date
4. Status updates to Sick

### 7.3 Register Return to Work

1. User clicks "Returned to Work"
2. Return date is confirmed
3. Sick period is closed
4. Duration is calculated and displayed

---

## 8. Error Handling & Validation

- Name field cannot be empty
- Return date cannot be earlier than sick start date
- Prevent multiple open sick periods for the same person
- Graceful handling of corrupted or missing `localStorage` data

---

## 9. Assumptions & Constraints

- Single-user, single-browser usage
- Data is browser-specific
- User understands that clearing browser data removes records

---

## 10. Future Enhancements (Not Required)

- Export data to CSV
- Filters by date range or department
- Charts for sickness trends
- Cloud sync or backend integration

---

## 11. Success Criteria

- User can manage personnel and sickness records without errors
- Data persists across page reloads
- No backend or external dependencies required

---

**End of Document**

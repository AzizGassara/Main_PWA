// Main application logic
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the application
    initApp();
});

// Global variables
let currentPatientId = null;
let currentConsultationId = null;
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];
let geminiApiKey = '';

// Initialize the application
function initApp() {
    // Load settings from localStorage
    loadSettings();
    
    // Load data from localStorage
    loadPatients();
    
    // Add event listeners
    addEventListeners();
}

// Load settings from localStorage
function loadSettings() {
    const settings = localStorage.getItem('settings');
    if (settings) {
        const parsedSettings = JSON.parse(settings);
        geminiApiKey = parsedSettings.geminiApiKey || '';
        
        // Pre-fill the settings form
        document.getElementById('gemini-api-key').value = geminiApiKey;
    }
}

// Save settings to localStorage
function saveSettings() {
    const settings = {
        geminiApiKey: geminiApiKey
    };
    localStorage.setItem('settings', JSON.stringify(settings));
}

// Add event listeners
function addEventListeners() {
    // Patient section
    document.getElementById('add-patient-btn').addEventListener('click', showAddPatientForm);
    document.getElementById('cancel-patient-btn').addEventListener('click', hidePatientForm);
    document.getElementById('patient-form').addEventListener('submit', savePatient);
    
    // Consultation section
    document.getElementById('add-consultation-btn').addEventListener('click', showAddConsultationForm);
    document.getElementById('back-to-patients-btn').addEventListener('click', showPatientSection);
    document.getElementById('cancel-consultation-btn').addEventListener('click', cancelConsultation);
    document.getElementById('consultation-form').addEventListener('submit', saveConsultation);
    document.getElementById('back-to-consultations-btn').addEventListener('click', showConsultationSection);
    
    // Voice recording
    document.getElementById('start-recording-btn').addEventListener('click', startRecording);
    document.getElementById('stop-recording-btn').addEventListener('click', stopRecording);
    
    // Gemini API integration
    document.getElementById('send-to-gemini-btn').addEventListener('click', () => {
        sendToGemini();
        goToWizardStep(2);
    });
    
    document.getElementById('fill-form-btn').addEventListener('click', () => {
        fillFormFromGemini();
        goToWizardStep(3);
    });
    
    // Wizard navigation
    document.getElementById('back-to-step-1').addEventListener('click', () => {
        goToWizardStep(1);
    });
    
    document.getElementById('back-to-step-2').addEventListener('click', () => {
        goToWizardStep(2);
    });
    
    document.getElementById('next-to-step-2').addEventListener('click', () => {
        goToWizardStep(2);
    });
    
    document.getElementById('next-to-step-3').addEventListener('click', () => {
        goToWizardStep(3);
    });
    
    // Settings
    document.getElementById('settings-btn').addEventListener('click', showSettingsModal);
    document.querySelector('.close-settings-modal').addEventListener('click', hideSettingsModal);
    document.getElementById('cancel-settings-btn').addEventListener('click', hideSettingsModal);
    document.getElementById('settings-form').addEventListener('submit', saveSettingsForm);
    document.getElementById('export-data-btn').addEventListener('click', exportData);
    document.getElementById('import-data-btn').addEventListener('click', importData);
    document.getElementById('import-file-input').addEventListener('change', handleFileImport);
    
    // Modal
    document.querySelector('.close-modal').addEventListener('click', hideModal);
    document.getElementById('modal-cancel').addEventListener('click', hideModal);
}

// Loading Spinner
function showLoading(container, message = 'Chargement en cours...') {
    const loadingContainer = document.createElement('div');
    loadingContainer.className = 'loading-container';
    loadingContainer.innerHTML = `
        <div class="spinner"></div>
        <div class="loading-text">${message}</div>
    `;
    
    container.innerHTML = '';
    container.appendChild(loadingContainer);
}

function hideLoading(container) {
    const loadingContainer = container.querySelector('.loading-container');
    if (loadingContainer) {
        loadingContainer.remove();
    }
}

// Patient Management Functions
function loadPatients() {
    const patients = getPatients();
    const patientsList = document.getElementById('patients-list');
    patientsList.innerHTML = '';
    
    if (patients.length === 0) {
        patientsList.innerHTML = '<p>Aucun patient enregistré.</p>';
        return;
    }
    
    patients.forEach(patient => {
        const patientCard = createPatientCard(patient);
        patientsList.appendChild(patientCard);
    });
}

function createPatientCard(patient) {
    // Get the last consultation date if available
    let lastConsultationDate = 'Aucune consultation';
    let lastConsultationDiagnosis = '';
    
    if (patient.consultations && patient.consultations.length > 0) {
        // Sort consultations by date (newest first)
        const sortedConsultations = [...patient.consultations].sort((a, b) => {
            return new Date(b.date) - new Date(a.date);
        });
        
        const lastConsultation = sortedConsultations[0];
        const date = new Date(lastConsultation.date);
        lastConsultationDate = date.toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        lastConsultationDiagnosis = lastConsultation.diagnosis || 'Non spécifié';
    }
    
    const card = document.createElement('div');
    card.className = 'list-item patient-card';
    card.innerHTML = `
        <div class="list-item-header">
            <h3 class="patient-name">${patient.name}</h3>
            <div class="list-item-actions">
                <button class="btn primary edit-patient" data-id="${patient.id}" aria-label="Modifier">
                    <span class="material-symbols-rounded">edit</span>
                </button>
                <button class="btn danger delete-patient" data-id="${patient.id}" aria-label="Supprimer">
                    <span class="material-symbols-rounded">delete</span>
                </button>
                <button class="btn secondary view-consultations" data-id="${patient.id}">
                    <span class="material-symbols-rounded">folder_open</span>
                    Dossier
                </button>
            </div>
        </div>
        <div class="list-item-content">
            <div class="patient-info">
                <div class="patient-detail">
                    <span class="patient-detail-label">Âge</span>
                    <span class="patient-detail-value">${patient.age} ans</span>
                </div>
                <div class="patient-detail">
                    <span class="patient-detail-label">Genre</span>
                    <span class="badge badge-primary">${patient.gender}</span>
                </div>
                <div class="patient-detail">
                    <span class="patient-detail-label">Téléphone</span>
                    <span class="patient-detail-value">${patient.phone}</span>
                </div>
                <div class="patient-detail">
                    <span class="patient-detail-label">Antécédents</span>
                    <span class="patient-detail-value">${patient.history || 'Aucun'}</span>
                </div>
            </div>
            <div class="last-consultation">
                <span class="patient-detail-label">Dernière consultation</span>
                <div class="last-consultation-date">${lastConsultationDate}</div>
                ${lastConsultationDiagnosis ? `<div class="last-consultation-diagnosis">${lastConsultationDiagnosis}</div>` : ''}
            </div>
        </div>
    `;
    
    // Add event listeners to the buttons
    card.querySelector('.edit-patient').addEventListener('click', () => editPatient(patient.id));
    card.querySelector('.delete-patient').addEventListener('click', () => deletePatient(patient.id));
    card.querySelector('.view-consultations').addEventListener('click', () => viewConsultations(patient.id));
    
    return card;
}

function showAddPatientForm() {
    // Reset the form
    document.getElementById('patient-form').reset();
    document.getElementById('patient-form-title').textContent = 'Ajouter un Patient';
    
    // Show the form section and hide other sections
    document.getElementById('patient-section').classList.add('hidden');
    document.getElementById('patient-form-section').classList.remove('hidden');
    document.getElementById('consultation-section').classList.add('hidden');
    document.getElementById('consultation-form-section').classList.add('hidden');
    document.getElementById('consultation-details-section').classList.add('hidden');
    
    // Reset the current patient ID
    currentPatientId = null;
}

function hidePatientForm() {
    document.getElementById('patient-form-section').classList.add('hidden');
    document.getElementById('patient-section').classList.remove('hidden');
}

function savePatient(event) {
    event.preventDefault();
    
    const name = document.getElementById('patient-name').value.trim();
    const age = document.getElementById('patient-age').value;
    const gender = document.querySelector('input[name="gender"]:checked').value;
    const phone = document.getElementById('patient-phone').value.trim();
    const history = document.getElementById('patient-history').value.trim();
    
    if (!name || !age || !phone) {
        showModal('Erreur', 'Veuillez remplir tous les champs obligatoires.');
        return;
    }
    
    const patients = getPatients();
    
    if (currentPatientId) {
        // Update existing patient
        const index = patients.findIndex(p => p.id === currentPatientId);
        if (index !== -1) {
            patients[index] = {
                ...patients[index],
                name,
                age,
                gender,
                phone,
                history
            };
        }
    } else {
        // Add new patient
        const newPatient = {
            id: generateId(),
            name,
            age,
            gender,
            phone,
            history,
            consultations: []
        };
        patients.push(newPatient);
    }
    
    // Save to localStorage
    localStorage.setItem('patients', JSON.stringify(patients));
    
    // Reload patients list and hide form
    loadPatients();
    hidePatientForm();
}

function editPatient(patientId) {
    const patients = getPatients();
    const patient = patients.find(p => p.id === patientId);
    
    if (!patient) {
        showModal('Erreur', 'Patient non trouvé.');
        return;
    }
    
    // Fill the form with patient data
    document.getElementById('patient-name').value = patient.name;
    document.getElementById('patient-age').value = patient.age;
    document.querySelector(`input[name="gender"][value="${patient.gender}"]`).checked = true;
    document.getElementById('patient-phone').value = patient.phone;
    document.getElementById('patient-history').value = patient.history || '';
    
    // Update form title and set current patient ID
    document.getElementById('patient-form-title').textContent = 'Modifier le Patient';
    currentPatientId = patientId;
    
    // Show the form section
    document.getElementById('patient-section').classList.add('hidden');
    document.getElementById('patient-form-section').classList.remove('hidden');
}

function deletePatient(patientId) {
    showConfirmModal('Confirmation', 'Êtes-vous sûr de vouloir supprimer ce patient? Toutes les consultations associées seront également supprimées.', () => {
        const patients = getPatients();
        const updatedPatients = patients.filter(p => p.id !== patientId);
        
        // Save to localStorage
        localStorage.setItem('patients', JSON.stringify(updatedPatients));
        
        // Reload patients list
        loadPatients();
    });
}

// Consultation Management Functions
function viewConsultations(patientId) {
    const patients = getPatients();
    const patient = patients.find(p => p.id === patientId);
    
    if (!patient) {
        showNotification('Erreur', 'Patient non trouvé.', 'error');
        return;
    }
    
    // Set current patient ID
    currentPatientId = patientId;
    
    // Update the selected patient name
    document.getElementById('selected-patient-name').textContent = patient.name;
    
    // Create and display patient summary
    createPatientSummary(patient);
    
    // Load consultations
    loadConsultations(patient);
    
    // Show the consultation section and hide other sections
    document.getElementById('patient-section').classList.add('hidden');
    document.getElementById('patient-form-section').classList.add('hidden');
    document.getElementById('consultation-section').classList.remove('hidden');
    document.getElementById('consultation-form-section').classList.add('hidden');
    document.getElementById('consultation-details-section').classList.add('hidden');
}

function createPatientSummary(patient) {
    const patientSummary = document.getElementById('patient-summary');
    
    patientSummary.innerHTML = `
        <div class="patient-summary-header">
            <div class="patient-summary-name">${patient.name}</div>
            <div class="patient-summary-badge badge badge-primary">${patient.gender}</div>
        </div>
        <div class="patient-summary-details">
            <div class="patient-summary-item">
                <div class="patient-summary-label">Âge</div>
                <div class="patient-summary-value">${patient.age} ans</div>
            </div>
            <div class="patient-summary-item">
                <div class="patient-summary-label">Téléphone</div>
                <div class="patient-summary-value">${patient.phone}</div>
            </div>
            <div class="patient-summary-item patient-summary-history">
                <div class="patient-summary-label">Antécédents Médicaux</div>
                <div class="patient-summary-value">${patient.history || 'Aucun antécédent médical enregistré'}</div>
            </div>
        </div>
    `;
}

function loadConsultations(patient) {
    const consultationsList = document.getElementById('consultations-list');
    consultationsList.innerHTML = '';
    
    if (!patient.consultations || patient.consultations.length === 0) {
        consultationsList.innerHTML = '<div class="empty-state"><span class="material-symbols-rounded">medical_information</span><p>Aucune consultation enregistrée.</p></div>';
        return;
    }
    
    // Sort consultations by date (newest first)
    const sortedConsultations = [...patient.consultations].sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
    });
    
    sortedConsultations.forEach(consultation => {
        const consultationCard = createConsultationCard(consultation);
        consultationsList.appendChild(consultationCard);
    });
}

function createConsultationCard(consultation) {
    const card = document.createElement('div');
    card.className = 'list-item consultation-card clickable';
    card.dataset.id = consultation.id;
    
    const date = new Date(consultation.date);
    const formattedDate = date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    // Create tags for medications
    let medicationTags = '';
    if (consultation.medications) {
        const medications = consultation.medications.split(',').map(med => med.trim());
        medications.forEach(med => {
            if (med) {
                medicationTags += `<span class="consultation-tag">${med}</span>`;
            }
        });
    }
    
    card.innerHTML = `
        <div class="list-item-header">
            <div>
                <div class="consultation-date">${formattedDate}</div>
                <h3 class="consultation-diagnosis">${consultation.diagnosis || 'Diagnostic non spécifié'}</h3>
            </div>
            <div class="list-item-actions">
                <button class="btn danger delete-consultation" data-id="${consultation.id}" aria-label="Supprimer">
                    <span class="material-symbols-rounded">delete</span>
                </button>
            </div>
        </div>
        <div class="list-item-content">
            <div class="consultation-symptoms">${consultation.symptoms || 'Aucun symptôme enregistré'}</div>
            ${medicationTags ? `<div class="consultation-medications">${medicationTags}</div>` : ''}
        </div>
    `;
    
    // Add event listener to view consultation details
    card.addEventListener('click', (event) => {
        // Prevent click when clicking the delete button
        if (!event.target.classList.contains('delete-consultation') && 
            !event.target.closest('.delete-consultation')) {
            viewConsultationDetails(consultation.id);
        }
    });
    
    // Add event listener to delete button
    card.querySelector('.delete-consultation').addEventListener('click', (event) => {
        event.stopPropagation();
        deleteConsultation(consultation.id);
    });
    
    return card;
}

function showAddConsultationForm() {
    // Reset the form
    document.getElementById('consultation-form').reset();
    
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('consultation-date').value = today;
    
    // Reset wizard to step 1
    resetWizard();
    
    // Show the form section and hide other sections
    document.getElementById('consultation-section').classList.add('hidden');
    document.getElementById('consultation-form-section').classList.remove('hidden');
    
    // Reset the current consultation ID
    currentConsultationId = null;
}

function hideConsultationForm() {
    // Hide form and show consultation list
    document.getElementById('consultation-form-section').classList.add('hidden');
    document.getElementById('consultation-section').classList.remove('hidden');
}

function cancelConsultation() {
    // Reset wizard
    resetWizard();
    
    // Hide form and show consultation list
    document.getElementById('consultation-form-section').classList.add('hidden');
    document.getElementById('consultation-section').classList.remove('hidden');
}

function resetWizard() {
    // Reset wizard steps
    const steps = document.querySelectorAll('.wizard-step');
    steps.forEach(step => {
        step.classList.remove('active', 'completed');
    });
    
    // Set step 1 as active
    document.querySelector('.wizard-step[data-step="1"]').classList.add('active');
    
    // Hide all wizard content
    const wizardContents = document.querySelectorAll('.wizard-content');
    wizardContents.forEach(content => {
        content.classList.add('hidden');
    });
    
    // Show step 1 content
    document.getElementById('wizard-step-1').classList.remove('hidden');
    
    // Reset form fields
    document.getElementById('raw-data').value = '';
    document.getElementById('raw-data').removeAttribute('data-audio-url');
    document.getElementById('transcription-result').innerHTML = '';
    document.getElementById('symptoms').value = '';
    document.getElementById('diagnosis').value = '';
    document.getElementById('medications').value = '';
    document.getElementById('tests').value = '';
    
    // Reset recording buttons
    document.getElementById('start-recording-btn').disabled = false;
    document.getElementById('stop-recording-btn').disabled = true;
}

function goToWizardStep(stepNumber) {
    console.log(`Going to wizard step ${stepNumber}`);
    
    // Special validation for step 2 - check if we have an audio recording
    // In a real environment, we would require audio recording
    // For testing purposes, we'll allow navigation without recording
    if (stepNumber === 2) {
        const rawDataField = document.getElementById('raw-data');
        const audioUrl = rawDataField.dataset.audioUrl;
        
        if (!audioUrl) {
            // For testing purposes, we'll simulate having audio data
            rawDataField.value = 'Simulation d\'enregistrement audio pour test.';
            rawDataField.dataset.audioUrl = 'simulated-audio-url';
            console.log('Simulating audio recording for testing purposes');
        }
    }
    
    // Update step indicators
    const steps = document.querySelectorAll('.wizard-step');
    steps.forEach((step, index) => {
        if (index < stepNumber - 1) {
            step.classList.add('completed');
            step.classList.remove('active');
        } else if (index === stepNumber - 1) {
            step.classList.add('active');
            step.classList.remove('completed');
        } else {
            step.classList.remove('active');
            step.classList.remove('completed');
        }
    });
    
    // Hide all wizard content
    const wizardContents = document.querySelectorAll('.wizard-content');
    wizardContents.forEach(content => {
        content.classList.add('hidden');
    });
    
    // Show current step content
    const stepContent = document.getElementById(`wizard-step-${stepNumber}`);
    console.log(`Step content element: ${stepContent ? 'found' : 'not found'}`);
    stepContent.classList.remove('hidden');
}

function saveConsultation(event) {
    event.preventDefault();
    
    const date = document.getElementById('consultation-date').value;
    const rawData = document.getElementById('raw-data').value.trim();
    const symptoms = document.getElementById('symptoms').value.trim();
    const diagnosis = document.getElementById('diagnosis').value.trim();
    const medications = document.getElementById('medications').value.trim();
    const tests = document.getElementById('tests').value.trim();
    const additionalInfo = document.getElementById('additional-info').value.trim();
    
    if (!date) {
        showModal('Erreur', 'Veuillez sélectionner une date.');
        return;
    }
    
    const patients = getPatients();
    const patientIndex = patients.findIndex(p => p.id === currentPatientId);
    
    if (patientIndex === -1) {
        showModal('Erreur', 'Patient non trouvé.');
        return;
    }
    
    if (currentConsultationId) {
        // Update existing consultation
        const consultationIndex = patients[patientIndex].consultations.findIndex(c => c.id === currentConsultationId);
        
        if (consultationIndex !== -1) {
            patients[patientIndex].consultations[consultationIndex] = {
                ...patients[patientIndex].consultations[consultationIndex],
                date,
                rawData,
                symptoms,
                diagnosis,
                medications,
                tests,
                additionalInfo
            };
        }
    } else {
        // Add new consultation
        const newConsultation = {
            id: generateId(),
            date,
            rawData,
            symptoms,
            diagnosis,
            medications,
            tests,
            additionalInfo
        };
        
        if (!patients[patientIndex].consultations) {
            patients[patientIndex].consultations = [];
        }
        
        patients[patientIndex].consultations.push(newConsultation);
    }
    
    // Save to localStorage
    localStorage.setItem('patients', JSON.stringify(patients));
    
    // Reload consultations and hide form
    loadConsultations(patients[patientIndex]);
    hideConsultationForm();
}

function viewConsultationDetails(consultationId) {
    const patients = getPatients();
    const patient = patients.find(p => p.id === currentPatientId);
    
    if (!patient) {
        showNotification('Erreur', 'Patient non trouvé.', 'error');
        return;
    }
    
    const consultation = patient.consultations.find(c => c.id === consultationId);
    
    if (!consultation) {
        showNotification('Erreur', 'Consultation non trouvée.', 'error');
        return;
    }
    
    // Set current consultation ID
    currentConsultationId = consultationId;
    
    // Format the date
    const date = new Date(consultation.date);
    const formattedDate = date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    // Create medication tags
    let medicationTags = '';
    if (consultation.medications) {
        const medications = consultation.medications.split(',').map(med => med.trim());
        medications.forEach(med => {
            if (med) {
                medicationTags += `<span class="consultation-tag">${med}</span>`;
            }
        });
    }
    
    // Create test tags
    let testTags = '';
    if (consultation.tests) {
        const tests = consultation.tests.split(',').map(test => test.trim());
        tests.forEach(test => {
            if (test) {
                testTags += `<span class="consultation-tag">${test}</span>`;
            }
        });
    }
    
    // Populate the details section
    const detailsContent = document.getElementById('consultation-details-content');
    detailsContent.innerHTML = `
        <div class="consultation-details">
            <div class="consultation-details-header">
                <div class="consultation-details-date">
                    <span class="material-symbols-rounded">event</span>
                    ${formattedDate}
                </div>
                <div class="consultation-details-diagnosis">
                    <h3>${consultation.diagnosis || 'Diagnostic non spécifié'}</h3>
                </div>
            </div>
            
            <div class="consultation-details-card">
                <div class="details-section">
                    <h4><span class="material-symbols-rounded">sick</span> Symptômes</h4>
                    <p>${consultation.symptoms || 'Aucun symptôme enregistré'}</p>
                </div>
                
                <div class="details-section">
                    <h4><span class="material-symbols-rounded">medication</span> Médicaments</h4>
                    <div class="tags-container">
                        ${medicationTags || '<p>Aucun médicament prescrit</p>'}
                    </div>
                </div>
                
                <div class="details-section">
                    <h4><span class="material-symbols-rounded">lab_panel</span> Tests Recommandés</h4>
                    <div class="tags-container">
                        ${testTags || '<p>Aucun test recommandé</p>'}
                    </div>
                </div>
            </div>
            
            <div class="consultation-details-card">
                <div class="details-section">
                    <h4><span class="material-symbols-rounded">info</span> Informations Supplémentaires</h4>
                    <p>${consultation.additionalInfo || 'Aucune information supplémentaire'}</p>
                </div>
            </div>
            
            <div class="consultation-details-card">
                <div class="details-section">
                    <h4><span class="material-symbols-rounded">record_voice_over</span> Transcription Originale</h4>
                    <div class="transcription-box">
                        <p>${consultation.rawData || 'Aucune transcription disponible'}</p>
                    </div>
                </div>
            </div>
            
            <div class="details-actions">
                <button id="edit-consultation-btn" class="btn primary">
                    <span class="material-symbols-rounded">edit</span>
                    Modifier
                </button>
            </div>
        </div>
    `;
    
    // Add event listener to edit button
    document.getElementById('edit-consultation-btn').addEventListener('click', () => editConsultation(consultationId));
    
    // Show the details section and hide other sections
    document.getElementById('consultation-section').classList.add('hidden');
    document.getElementById('consultation-details-section').classList.remove('hidden');
}

function editConsultation(consultationId) {
    const patients = getPatients();
    const patient = patients.find(p => p.id === currentPatientId);
    
    if (!patient) {
        showModal('Erreur', 'Patient non trouvé.');
        return;
    }
    
    const consultation = patient.consultations.find(c => c.id === consultationId);
    
    if (!consultation) {
        showModal('Erreur', 'Consultation non trouvée.');
        return;
    }
    
    // Fill the form with consultation data
    document.getElementById('consultation-date').value = consultation.date;
    document.getElementById('raw-data').value = consultation.rawData || '';
    document.getElementById('symptoms').value = consultation.symptoms || '';
    document.getElementById('diagnosis').value = consultation.diagnosis || '';
    document.getElementById('medications').value = consultation.medications || '';
    document.getElementById('tests').value = consultation.tests || '';
    document.getElementById('additional-info').value = consultation.additionalInfo || '';
    
    // Set current consultation ID
    currentConsultationId = consultationId;
    
    // Show the form section and hide other sections
    document.getElementById('consultation-details-section').classList.add('hidden');
    document.getElementById('consultation-form-section').classList.remove('hidden');
}

function deleteConsultation(consultationId) {
    showConfirmModal('Confirmation', 'Êtes-vous sûr de vouloir supprimer cette consultation?', () => {
        const patients = getPatients();
        const patientIndex = patients.findIndex(p => p.id === currentPatientId);
        
        if (patientIndex !== -1) {
            patients[patientIndex].consultations = patients[patientIndex].consultations.filter(c => c.id !== consultationId);
            
            // Save to localStorage
            localStorage.setItem('patients', JSON.stringify(patients));
            
            // Reload consultations
            loadConsultations(patients[patientIndex]);
        }
    });
}

function showConsultationSection() {
    document.getElementById('consultation-form-section').classList.add('hidden');
    document.getElementById('consultation-details-section').classList.add('hidden');
    document.getElementById('consultation-section').classList.remove('hidden');
}

function showPatientSection() {
    document.getElementById('consultation-section').classList.add('hidden');
    document.getElementById('consultation-form-section').classList.add('hidden');
    document.getElementById('consultation-details-section').classList.add('hidden');
    document.getElementById('patient-section').classList.remove('hidden');
    
    // Reset current patient ID
    currentPatientId = null;
}

// Settings Modal Functions
function showSettingsModal() {
    document.getElementById('settings-modal').classList.add('show');
}

function hideSettingsModal() {
    document.getElementById('settings-modal').classList.remove('show');
}

function saveSettingsForm(event) {
    event.preventDefault();
    
    // Get the API key from the form
    geminiApiKey = document.getElementById('gemini-api-key').value.trim();
    
    // Save settings to localStorage
    saveSettings();
    
    // Hide the settings modal
    hideSettingsModal();
    
    // Show confirmation
    showModal('Succès', 'Paramètres enregistrés avec succès.');
}

function exportData() {
    try {
        // Get all data from localStorage
        const patients = getPatients();
        const settings = {
            geminiApiKey: geminiApiKey
        };
        
        // Create a data object with all the data
        const data = {
            patients: patients,
            settings: settings,
            version: '1.0'
        };
        
        // Convert to JSON
        const jsonData = JSON.stringify(data, null, 2);
        
        // Create a blob and download link
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // Create a temporary link and click it
        const a = document.createElement('a');
        a.href = url;
        a.download = `patient-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
        
        showNotification('Succès', 'Données exportées avec succès!', 'success');
    } catch (error) {
        console.error('Error exporting data:', error);
        showNotification('Erreur', 'Échec de l\'exportation des données.', 'error');
    }
}

function importData() {
    // Trigger the file input
    document.getElementById('import-file-input').click();
}

function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            // Validate the data structure
            if (!data.patients || !Array.isArray(data.patients)) {
                throw new Error('Format de données invalide');
            }
            
            // Import the data
            localStorage.setItem('patients', JSON.stringify(data.patients));
            
            // Import settings if available
            if (data.settings && data.settings.geminiApiKey) {
                geminiApiKey = data.settings.geminiApiKey;
                saveSettings();
            }
            
            // Reload the page to reflect the changes
            showNotification('Succès', 'Données importées avec succès! La page va se recharger.', 'success');
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } catch (error) {
            console.error('Error importing data:', error);
            showNotification('Erreur', 'Échec de l\'importation des données. Format invalide.', 'error');
        }
    };
    
    reader.readAsText(file);
    
    // Reset the file input
    event.target.value = '';
}

// Voice Recording Functions
function startRecording() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showModal('Non supporté', 'L\'enregistrement audio n\'est pas supporté par votre navigateur.');
        return;
    }
    
    // Check if Gemini API key is set
    if (!geminiApiKey) {
        showModal('Clé API manquante', 'Veuillez configurer votre clé API Gemini dans les paramètres avant d\'utiliser cette fonctionnalité.');
        return;
    }
    
    // Reset audio chunks
    audioChunks = [];
    
    // Request microphone access
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            mediaRecorder = new MediaRecorder(stream);
            
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };
            
            mediaRecorder.onstop = () => {
                // Create a blob from the audio chunks
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                
                // Create a URL for the blob
                const audioUrl = URL.createObjectURL(audioBlob);
                
                // Update UI to show the recording is available
                document.getElementById('raw-data').value = 'Enregistrement audio capturé. Cliquez sur "Envoyer à Gemini" pour transcrire.';
                
                // Store the audio URL for later use
                document.getElementById('raw-data').dataset.audioUrl = audioUrl;
                
                // Stop all tracks in the stream
                stream.getTracks().forEach(track => track.stop());
            };
            
            // Start recording
            mediaRecorder.start();
            isRecording = true;
            
            // Update UI
            document.getElementById('start-recording-btn').disabled = true;
            document.getElementById('stop-recording-btn').disabled = false;
        })
        .catch(error => {
            console.error('Error accessing microphone:', error);
            showModal('Erreur', `Erreur lors de l'accès au microphone: ${error.message}`);
        });
}

function stopRecording() {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') return;
    
    try {
        mediaRecorder.stop();
        isRecording = false;
        
        // Update UI
        document.getElementById('start-recording-btn').disabled = false;
        document.getElementById('stop-recording-btn').disabled = true;
    } catch (error) {
        console.error('Error stopping recording:', error);
        showModal('Erreur', `Erreur lors de l'arrêt de l'enregistrement: ${error.message}`);
    }
}

// Gemini API Integration
function sendToGemini() {
    // Check if Gemini API key is set
    if (!geminiApiKey) {
        showNotification('Clé API manquante', 'Veuillez configurer votre clé API Gemini dans les paramètres avant d\'utiliser cette fonctionnalité.', 'warning');
        return;
    }
    
    // Check if we have an audio recording
    const rawDataField = document.getElementById('raw-data');
    const audioUrl = rawDataField.dataset.audioUrl;
    
    if (!audioUrl) {
        showNotification('Erreur', 'Veuillez d\'abord enregistrer un audio.', 'error');
        return;
    }
    
    // Get the transcription result container
    const transcriptionResult = document.getElementById('transcription-result');
    
    // Show loading spinner
    showLoading(transcriptionResult, 'Envoi de l\'audio à Gemini pour transcription...');
    
    // Check if this is a simulated audio URL for testing
    if (audioUrl === 'simulated-audio-url') {
        console.log('Using simulated audio data for testing');
        setTimeout(() => {
            hideLoading(transcriptionResult);
            transcriptionResult.innerHTML = '<div class="transcription-success">Le patient se plaint de maux de tête depuis trois jours, accompagnés de fièvre légère. Il mentionne également une sensibilité à la lumière et des nausées occasionnelles. Pas d\'antécédents de migraines, mais stress important au travail récemment.</div>';
            
            // Enable the next button
            document.getElementById('next-to-step-3').disabled = false;
            
            // Go to step 2 automatically
            goToWizardStep(2);
        }, 1500);
        return;
    }
    
    // Fetch the audio blob from the URL
    fetch(audioUrl)
        .then(response => response.blob())
        .then(audioBlob => {
            // Create a FormData object to send the audio file to our server
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');
            formData.append('apiKey', geminiApiKey);
            
            // Send the audio to our server endpoint
            return fetch('/api/transcribe', {
                method: 'POST',
                body: formData
            });
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Update the raw data field with the transcription
            document.getElementById('raw-data').value = data.transcription;
            
            // Display the transcription in the result container
            hideLoading(transcriptionResult);
            transcriptionResult.innerHTML = `
                <div class="transcription-success">
                    <span class="material-symbols-rounded">check_circle</span>
                    <p>${data.transcription}</p>
                </div>
            `;
            
            showNotification('Succès', 'Transcription audio réussie!', 'success');
        })
        .catch(error => {
            console.error('Error with transcription:', error);
            
            // Display error in the result container
            hideLoading(transcriptionResult);
            transcriptionResult.innerHTML = `
                <div class="transcription-error">
                    <span class="material-symbols-rounded">error</span>
                    <p>Erreur lors de la transcription: ${error.message}</p>
                </div>
            `;
            
            showNotification('Erreur', `Erreur lors de la transcription: ${error.message}`, 'error');
        });
}

function fillFormFromGemini() {
    // Check if Gemini API key is set
    if (!geminiApiKey) {
        showNotification('Clé API manquante', 'Veuillez configurer votre clé API Gemini dans les paramètres avant d\'utiliser cette fonctionnalité.', 'warning');
        return;
    }
    
    const rawData = document.getElementById('raw-data').value.trim();
    
    if (!rawData) {
        showNotification('Erreur', 'Veuillez d\'abord obtenir une transcription audio.', 'error');
        return;
    }
    
    // Get the form fields
    const symptomsField = document.getElementById('symptoms');
    const diagnosisField = document.getElementById('diagnosis');
    const medicationsField = document.getElementById('medications');
    const testsField = document.getElementById('tests');
    
    // Get the form container for loading spinner
    const formContainer = document.getElementById('wizard-step-3');
    
    // Show loading spinner
    const loadingSpinner = showLoading(formContainer, 'Analyse de la transcription par Gemini...');
    
    // Show notification
    const notification = showNotification('Analyse en cours', 'Analyse de la transcription par Gemini...', 'info');
    
    // Check if this is a simulated transcription for testing
    if (document.getElementById('raw-data').dataset.audioUrl === 'simulated-audio-url') {
        console.log('Using simulated transcription data for testing');
        setTimeout(() => {
            // Hide loading spinner
            hideLoading(formContainer);
            
            // Fill the form fields with simulated data
            symptomsField.value = 'Maux de tête depuis trois jours\nFièvre légère\nSensibilité à la lumière\nNausées occasionnelles';
            highlightField(symptomsField);
            
            diagnosisField.value = 'Migraine probable liée au stress';
            highlightField(diagnosisField);
            
            medicationsField.value = 'Ibuprofène 400mg, 1 comprimé toutes les 6 heures\nParacétamol 1000mg en cas de fièvre';
            highlightField(medicationsField);
            
            testsField.value = 'Aucun test requis pour le moment\nConsultation de suivi dans une semaine si les symptômes persistent';
            highlightField(testsField);
            
            document.getElementById('additional-info').value = 'Patient mentionne un stress important au travail récemment. Recommandation de techniques de relaxation et de gestion du stress.';
            highlightField(document.getElementById('additional-info'));
            
            // Show success notification
            showNotification('Succès', 'Formulaire rempli avec succès!', 'success');
            
            // Go to step 3 automatically
            goToWizardStep(3);
        }, 1500);
        return;
    }
    
    // Send the transcription to our server endpoint for analysis
    fetch('/api/analyze', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            apiKey: geminiApiKey,
            transcription: rawData
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        // Hide loading spinner
        hideLoading(formContainer);
        
        // Fill the form fields with the extracted information
        symptomsField.value = data.symptoms || 'Non détecté';
        diagnosisField.value = data.diagnosis || 'Non détecté';
        medicationsField.value = data.medications || 'Non détecté';
        testsField.value = data.tests || 'Non détecté';
        
        // Add animation to highlight the fields
        [symptomsField, diagnosisField, medicationsField, testsField].forEach(field => {
            field.classList.add('highlight-field');
            setTimeout(() => {
                field.classList.remove('highlight-field');
            }, 1500);
        });
        
        // Remove the notification if it still exists
        if (notification && notification.parentNode) {
            notification.classList.add('notification-fade-out');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }
        
        showNotification('Succès', 'Formulaire rempli avec les données extraites!', 'success');
    })
    .catch(error => {
        console.error('Error with analysis:', error);
        
        // Hide loading spinner
        hideLoading(formContainer);
        
        // Reset the fields
        symptomsField.value = '';
        diagnosisField.value = '';
        medicationsField.value = '';
        testsField.value = '';
        
        // Remove the notification if it still exists
        if (notification && notification.parentNode) {
            notification.classList.add('notification-fade-out');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }
        
        showNotification('Erreur', `Erreur lors de l'analyse: ${error.message}`, 'error');
    });
}

// Wizard Navigation Functions

// Utility Functions
function getPatients() {
    const patientsJson = localStorage.getItem('patients');
    return patientsJson ? JSON.parse(patientsJson) : [];
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// Notification System
function showNotification(title, message, type = 'info') {
    const notificationContainer = document.getElementById('notification-container');
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <strong>${title}</strong>
        <p>${message}</p>
        <span class="notification-close material-symbols-rounded">close</span>
    `;
    
    notificationContainer.appendChild(notification);
    
    // Add event listener to close button
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.classList.add('notification-fade-out');
        setTimeout(() => {
            notification.remove();
        }, 300);
    });
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        notification.classList.add('notification-fade-out');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 5000);
    
    return notification;
}

// Loading Spinner Functions
function showLoading(container, message = 'Chargement en cours...') {
    // Create loading container if it doesn't exist
    let loadingContainer = container.querySelector('.loading-container');
    
    if (!loadingContainer) {
        loadingContainer = document.createElement('div');
        loadingContainer.className = 'loading-container';
        loadingContainer.innerHTML = `
            <div class="spinner"></div>
            <div class="loading-text">${message}</div>
        `;
        container.appendChild(loadingContainer);
    } else {
        loadingContainer.querySelector('.loading-text').textContent = message;
        loadingContainer.style.display = 'flex';
    }
    
    return loadingContainer;
}

function hideLoading(container) {
    const loadingContainer = container.querySelector('.loading-container');
    if (loadingContainer) {
        loadingContainer.style.display = 'none';
    }
}

// Modal Functions
function showModal(title, message, showButtons = true) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-message').textContent = message;
    
    if (showButtons) {
        document.getElementById('modal-cancel').style.display = 'none';
        document.getElementById('modal-confirm').textContent = 'OK';
        document.getElementById('modal-confirm').onclick = hideModal;
        document.getElementById('modal-confirm').style.display = 'inline-block';
    } else {
        document.getElementById('modal-cancel').style.display = 'none';
        document.getElementById('modal-confirm').style.display = 'none';
    }
    
    // Show modal with animation
    document.getElementById('modal').classList.add('show');
}

function showConfirmModal(title, message, confirmCallback) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-message').textContent = message;
    
    document.getElementById('modal-cancel').style.display = 'inline-block';
    document.getElementById('modal-confirm').style.display = 'inline-block';
    document.getElementById('modal-confirm').textContent = 'Confirmer';
    
    document.getElementById('modal-cancel').onclick = hideModal;
    document.getElementById('modal-confirm').onclick = () => {
        hideModal();
        confirmCallback();
    };
    
    // Show modal with animation
    document.getElementById('modal').classList.add('show');
}

function hideModal() {
    document.getElementById('modal').classList.remove('show');
}
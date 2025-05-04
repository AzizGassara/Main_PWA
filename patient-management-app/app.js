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
    document.getElementById('cancel-consultation-btn').addEventListener('click', hideConsultationForm);
    document.getElementById('consultation-form').addEventListener('submit', saveConsultation);
    document.getElementById('back-to-consultations-btn').addEventListener('click', showConsultationSection);
    
    // Voice recording
    document.getElementById('start-recording-btn').addEventListener('click', startRecording);
    document.getElementById('stop-recording-btn').addEventListener('click', stopRecording);
    
    // Gemini API integration
    document.getElementById('send-to-gemini-btn').addEventListener('click', sendToGemini);
    document.getElementById('fill-form-btn').addEventListener('click', fillFormFromGemini);
    
    // Settings
    document.getElementById('settings-btn').addEventListener('click', showSettingsModal);
    document.querySelector('.close-settings-modal').addEventListener('click', hideSettingsModal);
    document.getElementById('cancel-settings-btn').addEventListener('click', hideSettingsModal);
    document.getElementById('settings-form').addEventListener('submit', saveSettingsForm);
    
    // Modal
    document.querySelector('.close-modal').addEventListener('click', hideModal);
    document.getElementById('modal-cancel').addEventListener('click', hideModal);
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
    const card = document.createElement('div');
    card.className = 'list-item';
    card.innerHTML = `
        <div class="list-item-header">
            <h3>${patient.name}</h3>
            <div class="list-item-actions">
                <button class="btn primary edit-patient" data-id="${patient.id}">Modifier</button>
                <button class="btn danger delete-patient" data-id="${patient.id}">Supprimer</button>
                <button class="btn secondary view-consultations" data-id="${patient.id}">Consultations</button>
            </div>
        </div>
        <div class="list-item-content">
            <div class="list-item-field"><span>Âge:</span> ${patient.age} ans</div>
            <div class="list-item-field"><span>Genre:</span> ${patient.gender}</div>
            <div class="list-item-field"><span>Téléphone:</span> ${patient.phone}</div>
            <div class="list-item-field"><span>Antécédents:</span> ${patient.history || 'Aucun'}</div>
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
        showModal('Erreur', 'Patient non trouvé.');
        return;
    }
    
    // Set current patient ID
    currentPatientId = patientId;
    
    // Update the selected patient name
    document.getElementById('selected-patient-name').textContent = patient.name;
    
    // Load consultations
    loadConsultations(patient);
    
    // Show the consultation section and hide other sections
    document.getElementById('patient-section').classList.add('hidden');
    document.getElementById('patient-form-section').classList.add('hidden');
    document.getElementById('consultation-section').classList.remove('hidden');
    document.getElementById('consultation-form-section').classList.add('hidden');
    document.getElementById('consultation-details-section').classList.add('hidden');
}

function loadConsultations(patient) {
    const consultationsList = document.getElementById('consultations-list');
    consultationsList.innerHTML = '';
    
    if (!patient.consultations || patient.consultations.length === 0) {
        consultationsList.innerHTML = '<p>Aucune consultation enregistrée.</p>';
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
    card.className = 'list-item clickable';
    card.dataset.id = consultation.id;
    
    const date = new Date(consultation.date);
    const formattedDate = date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    card.innerHTML = `
        <div class="list-item-header">
            <h3>Consultation du ${formattedDate}</h3>
            <div class="list-item-actions">
                <button class="btn danger delete-consultation" data-id="${consultation.id}">Supprimer</button>
            </div>
        </div>
        <div class="list-item-content">
            <div class="list-item-field"><span>Diagnostic:</span> ${consultation.diagnosis || 'Non spécifié'}</div>
        </div>
    `;
    
    // Add event listener to view consultation details
    card.addEventListener('click', (event) => {
        // Prevent click when clicking the delete button
        if (!event.target.classList.contains('delete-consultation')) {
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
    
    // Show the form section and hide other sections
    document.getElementById('consultation-section').classList.add('hidden');
    document.getElementById('consultation-form-section').classList.remove('hidden');
    
    // Reset the current consultation ID
    currentConsultationId = null;
}

function hideConsultationForm() {
    document.getElementById('consultation-form-section').classList.add('hidden');
    document.getElementById('consultation-section').classList.remove('hidden');
}

function saveConsultation(event) {
    event.preventDefault();
    
    const date = document.getElementById('consultation-date').value;
    const rawData = document.getElementById('raw-data').value.trim();
    const symptoms = document.getElementById('symptoms').value.trim();
    const diagnosis = document.getElementById('diagnosis').value.trim();
    const medications = document.getElementById('medications').value.trim();
    const tests = document.getElementById('tests').value.trim();
    
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
                tests
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
            tests
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
        showModal('Erreur', 'Patient non trouvé.');
        return;
    }
    
    const consultation = patient.consultations.find(c => c.id === consultationId);
    
    if (!consultation) {
        showModal('Erreur', 'Consultation non trouvée.');
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
    
    // Populate the details section
    const detailsContent = document.getElementById('consultation-details-content');
    detailsContent.innerHTML = `
        <div class="consultation-details">
            <h3>Consultation du ${formattedDate}</h3>
            
            <div class="details-section">
                <h4>Données Brutes</h4>
                <p>${consultation.rawData || 'Aucune donnée'}</p>
            </div>
            
            <div class="details-section">
                <h4>Symptômes</h4>
                <p>${consultation.symptoms || 'Non spécifiés'}</p>
            </div>
            
            <div class="details-section">
                <h4>Diagnostic</h4>
                <p>${consultation.diagnosis || 'Non spécifié'}</p>
            </div>
            
            <div class="details-section">
                <h4>Médicaments</h4>
                <p>${consultation.medications || 'Aucun'}</p>
            </div>
            
            <div class="details-section">
                <h4>Tests Recommandés</h4>
                <p>${consultation.tests || 'Aucun'}</p>
            </div>
            
            <div class="details-actions">
                <button id="edit-consultation-btn" class="btn primary">Modifier</button>
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
    document.getElementById('settings-modal').classList.remove('hidden');
}

function hideSettingsModal() {
    document.getElementById('settings-modal').classList.add('hidden');
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
        showModal('Clé API manquante', 'Veuillez configurer votre clé API Gemini dans les paramètres avant d\'utiliser cette fonctionnalité.');
        return;
    }
    
    // Check if we have an audio recording
    const rawDataField = document.getElementById('raw-data');
    const audioUrl = rawDataField.dataset.audioUrl;
    
    if (!audioUrl) {
        showModal('Erreur', 'Veuillez d\'abord enregistrer un audio.');
        return;
    }
    
    // Show processing modal
    showModal('Traitement', 'Envoi de l\'audio à Gemini pour transcription...', false);
    
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
            
            hideModal();
            showModal('Succès', 'Transcription audio réussie!');
        })
        .catch(error => {
            console.error('Error with transcription:', error);
            hideModal();
            showModal('Erreur', `Erreur lors de la transcription: ${error.message}`);
        });
}

function fillFormFromGemini() {
    // Check if Gemini API key is set
    if (!geminiApiKey) {
        showModal('Clé API manquante', 'Veuillez configurer votre clé API Gemini dans les paramètres avant d\'utiliser cette fonctionnalité.');
        return;
    }
    
    const rawData = document.getElementById('raw-data').value.trim();
    
    if (!rawData) {
        showModal('Erreur', 'Veuillez d\'abord obtenir une transcription audio.');
        return;
    }
    
    // Show processing modal
    showModal('Traitement', 'Analyse de la transcription par Gemini...', false);
    
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
        // Fill the form fields with the extracted information
        document.getElementById('symptoms').value = data.symptoms || 'Non détecté';
        document.getElementById('diagnosis').value = data.diagnosis || 'Non détecté';
        document.getElementById('medications').value = data.medications || 'Non détecté';
        document.getElementById('tests').value = data.tests || 'Non détecté';
        
        hideModal();
        showModal('Succès', 'Formulaire rempli avec les données extraites!');
    })
    .catch(error => {
        console.error('Error with analysis:', error);
        hideModal();
        showModal('Erreur', `Erreur lors de l'analyse: ${error.message}`);
    });
}

// Utility Functions
function getPatients() {
    const patientsJson = localStorage.getItem('patients');
    return patientsJson ? JSON.parse(patientsJson) : [];
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function showModal(title, message, showButtons = true) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-message').textContent = message;
    
    if (showButtons) {
        document.getElementById('modal-cancel').style.display = 'none';
        document.getElementById('modal-confirm').textContent = 'OK';
        document.getElementById('modal-confirm').onclick = hideModal;
    } else {
        document.getElementById('modal-cancel').style.display = 'none';
        document.getElementById('modal-confirm').style.display = 'none';
    }
    
    document.getElementById('modal').classList.remove('hidden');
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
    
    document.getElementById('modal').classList.remove('hidden');
}

function hideModal() {
    document.getElementById('modal').classList.add('hidden');
}
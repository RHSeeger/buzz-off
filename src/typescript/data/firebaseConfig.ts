/**
 * The Firebase project the game uses for family play. Copy these values from the Firebase console (Project settings →
 * Your apps → the web app's config); see SETUP-FIREBASE.md. Until apiKey is filled in, family play is turned off and
 * the game only plays locally.
 *
 * These values are public by design: they only say which project to talk to. What protects the data is the security
 * rules in database.rules.json.
 */

/** The web app's Firebase config */
export const FIREBASE_CONFIG = {
    apiKey: '',
    authDomain: '',
    databaseURL: '',
    projectId: '',
    appId: '',
};

/** Whether family play is available (the config above has been filled in) */
export const FAMILY_PLAY_AVAILABLE = FIREBASE_CONFIG.apiKey !== '' && FIREBASE_CONFIG.databaseURL !== '';

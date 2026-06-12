import emailjs from '@emailjs/browser';

// Initialize EmailJS with Public Key
const PUBLIC_KEY = "QPkJSkT3wryC5UezK";
const SERVICE_ID = "service_bnr99yp";
const TEMPLATE_ID = "template_7sg6m6a";
const MANAGER_EMAIL = "reshu.ranjan@gmail.com";

// Initialize the SDK
try {
  emailjs.init(PUBLIC_KEY);
  console.log("EmailJS successfully initialized.");
} catch (error) {
  console.error("EmailJS initialization failed:", error);
}

/**
 * Sends a notification email to the manager regarding customer complaints or special services
 * @param {Object} data - Form data
 * @param {string} data.tourCode - Active Tour Code
 * @param {string} data.clientName - Guest Name
 * @param {string} data.type - 'COMPLAINT' or 'SERVICE_REQUEST'
 * @param {string} data.category - Category (e.g. Vehicle, Driver, Meal)
 * @param {string} data.details - Detailed message description
 */
export const sendNotificationEmail = async ({ tourCode, clientName, type, category, details }) => {
  const templateParams = {
    to_email: MANAGER_EMAIL,
    subject: `[YATRIKA URGENT] New ${type} from Tour ${tourCode}`,
    tour_code: tourCode,
    client_name: clientName,
    alert_type: type,
    category: category,
    details: details,
    timestamp: new Date().toLocaleString(),
    reply_to: MANAGER_EMAIL // Default reply-to
  };

  console.log("Attempting to send EmailJS alert with parameters:", templateParams);

  try {
    const response = await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams);
    console.log("EmailJS send SUCCESS!", response.status, response.text);
    return { success: true, response };
  } catch (error) {
    console.error("EmailJS send FAILED. Falling back to console logging:", error);
    return { success: false, error };
  }
};

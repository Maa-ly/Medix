/**
 * Auth Relay Content Script
 * Runs on auth.html pages (localhost:5173 and medixx.vercel.app) to relay session data to extension
 */

console.log("[Auth Relay] Content script loaded");

// Listen for storage changes in the page
window.addEventListener("storage", (event) => {
  if (event.key === "medix_session" && event.newValue) {
    try {
      const sessionData = JSON.parse(event.newValue);
      console.log("[Auth Relay] Detected session update in localStorage:", sessionData);

      // Send to extension background
      chrome.runtime.sendMessage({
        type: "SESSION_UPDATED",
        data: sessionData,
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.log("[Auth Relay] Error sending message:", chrome.runtime.lastError);
        } else {
          console.log("[Auth Relay] Session relayed to extension:", response);
        }
      });
    } catch (error) {
      console.error("[Auth Relay] Error parsing session data:", error);
    }
  }
});

// Also check for session on page load
setTimeout(() => {
  const sessionStr = localStorage.getItem("medix_session");
  if (sessionStr) {
    try {
      const sessionData = JSON.parse(sessionStr);
      if (sessionData.isConnected) {
        console.log("[Auth Relay] Found existing session on load:", sessionData);

        // Send to extension background
        chrome.runtime.sendMessage({
          type: "SESSION_UPDATED",
          data: sessionData,
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.log("[Auth Relay] Error sending message:", chrome.runtime.lastError);
          } else {
            console.log("[Auth Relay] Session relayed to extension:", response);
          }
        });
      }
    } catch (error) {
      console.error("[Auth Relay] Error parsing session data:", error);
    }
  }
}, 1000); // Wait 1 second for page to fully load

// Listen for messages from the page (auth.tsx)
window.addEventListener("message", (event) => {
  // Only accept messages from same origin
  if (event.origin !== window.location.origin) return;

  if (event.data.type === "SESSION_UPDATED" && event.data.source === "medix-auth") {
    console.log("[Auth Relay] Received session update from page:", event.data.data);

    // Forward to extension background
    chrome.runtime.sendMessage({
      type: "SESSION_UPDATED",
      data: event.data.data,
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.log("[Auth Relay] Error sending message:", chrome.runtime.lastError);
      } else {
        console.log("[Auth Relay] Session relayed to extension:", response);
      }
    });
  }
});

console.log("[Auth Relay] Listening for session updates...");

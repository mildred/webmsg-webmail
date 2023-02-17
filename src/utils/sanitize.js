import DOMPurify from 'dompurify';

window.DOMPurify = DOMPurify

function sanitizeAttrsHook(node) {
  const HREF_REGEXP = /^https?:/
  if (node.hasAttribute('href')) {
    const href = node.getAttribute('href')

    // Remove links that are not http/https
    if (!href.match(HREF_REGEXP)) {
      node.removeAttribute('href')

    } else {
      // If a link text is an URL, the user expects the URL to be the same. if
      // not, override the link URL with the text displayed
      if (node.textContent.match(HREF_REGEXP) && node.textContent != href) {
        node.setAttribute('href', node.textContent)
      }
    }
  }
}

export function sanitize(text){
  const oldHook = DOMPurify.removeHook("afterSanitizeAttributes")
  try {
    DOMPurify.addHook("afterSanitizeAttributes", sanitizeAttrsHook)
    return DOMPurify.sanitize(text, {

      // Alter default DOMPurify configuration
      FORBID_TAGS: [
        // This one is really needed
        'svg',
        // Just to be sure
        'link', 'style', 'script'
      ],

      // Alter default DOMPurify configuration
      FORBID_ATTR: [
        // Prevent CSS that can link to external resources
        'style'
      ],

      // TODO: filter those better
      ADD_URI_SAFE_ATTR: ['href'],

      // Only allow data URI
      ALLOWED_URI_REGEXP: /^(data):/,

      // Return a whole document starting from <html>
      WHOLE_DOCUMENT: true,

      // Return DOM for more post-processing
      RETURN_DOM: true,
    })
  } finally {
    DOMPurify.removeHook("afterSanitizeAttributes")
    if (oldHook) DOMPurify.addHook("afterSanitizeAttributes", oldHook)
  }
}



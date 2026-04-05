const sanitizeEmailInput = (subject, body, sender) => {
  // Strip null bytes
  const stripNullBytes = (str) => (str ? str.replace(/\0/g, '') : '');

  let sanitizedSubject = stripNullBytes(subject);
  let sanitizedBody = stripNullBytes(body);
  let sanitizedSender = stripNullBytes(sender);

  // Limit lengths
  if (sanitizedSubject) sanitizedSubject = sanitizedSubject.substring(0, 500).trim();
  if (sanitizedBody) sanitizedBody = sanitizedBody.substring(0, 50000).trim();
  if (sanitizedSender) sanitizedSender = sanitizedSender.substring(0, 255).trim();

  return {
    subject: sanitizedSubject,
    body: sanitizedBody,
    sender: sanitizedSender
  };
};

module.exports = {
  sanitizeEmailInput
};

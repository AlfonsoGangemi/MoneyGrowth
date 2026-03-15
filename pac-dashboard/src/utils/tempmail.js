const DOMINI_BLOCCATI = new Set([
  'mailinator.com', 'guerrillamail.com', 'guerrillamail.info',
  'guerrillamail.biz', 'guerrillamail.de', 'guerrillamail.net',
  'guerrillamail.org', 'grr.la', 'sharklasers.com', 'spam4.me',
  'yopmail.com', 'yopmail.fr', 'cool.fr.nf', 'jetable.fr.nf',
  'nospam.ze.tc', 'nomail.xl.cx', 'mega.zik.dj', 'speed.1s.fr',
  'courriel.fr.nf', 'moncourrier.fr.nf', 'monemail.fr.nf',
  'monmail.fr.nf', 'trashmail.com', 'trashmail.at', 'trashmail.io',
  'trashmail.me', 'trashmail.net', 'dispostable.com', 'fakeinbox.com',
  'mailnull.com', 'spamgourmet.com', 'spamgourmet.net', 'spamgourmet.org',
  'tempmail.com', 'tempmail.net', 'tempmail.org', 'temp-mail.org',
  'throwam.com', 'throwam.net', 'mailtemp.net', 'getairmail.com',
  'filzmail.com', 'spamfree24.org', 'spamfree24.de', 'spamfree24.net',
  'spamfree24.info', 'spamfree24.biz', 'spamfree24.eu',
  'maildrop.cc', 'discard.email', 'spamhole.com', 'binkmail.com',
  'safetymail.info', 'mailmoat.com', 'spamavert.com',
  'mailnew.com', 'tempinbox.com', 'mailexpire.com',
])

export function isTempmail(email) {
  const dominio = email.split('@')[1]?.toLowerCase() ?? ''
  return DOMINI_BLOCCATI.has(dominio)
}

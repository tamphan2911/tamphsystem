const generatedResearchEmailSuffix = "@no-email.research.tamph.local";

export function isGeneratedResearchEmail(email?: string | null) {
  return Boolean(email?.toLowerCase().endsWith(generatedResearchEmailSuffix));
}

export function displayResearchEmail(email?: string | null) {
  if (!email || isGeneratedResearchEmail(email)) return "";
  return email;
}

export function displayResearchPersonName(user: {
  name?: string | null;
  email?: string | null;
}) {
  return user.name || displayResearchEmail(user.email);
}

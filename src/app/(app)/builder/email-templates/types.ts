export type EmailTemplate = {
  id: string;
  name: string;
  description: string;
  subject: string;
  html: string;
  createdAt?: string;
  updatedAt?: string;
};

export type EmailTemplatePayload = Pick<EmailTemplate, 'name' | 'description' | 'subject' | 'html'> & {
  id?: string;
};

export type PlaceholderValues = Record<string, string>;


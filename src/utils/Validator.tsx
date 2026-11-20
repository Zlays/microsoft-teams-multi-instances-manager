const regex = /[^a-zA-Z0-9 ]/g;
export default function inputValidator(text: string): string {
  return text.replace(regex, '');
}

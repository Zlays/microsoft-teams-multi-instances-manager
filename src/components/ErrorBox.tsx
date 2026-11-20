import { Alert, AlertDescription } from './ui/alert';

export interface Props {
  text: string;
  onClose?: () => void;
  className?: string;
}

function ErrorBox({ text, onClose, className }: Props) {
  if (!text) {
    return null;
  }

  return (
    <div className={className || 'px-3 pt-3'}>
      <Alert variant="destructive" onClose={onClose} className="py-2.5 px-3">
        <AlertDescription className="text-sm font-medium">{text}</AlertDescription>
      </Alert>
    </div>
  );
}

export default ErrorBox;

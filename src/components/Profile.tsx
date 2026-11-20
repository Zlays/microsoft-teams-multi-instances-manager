import { Button } from './ui/button';

export interface Props {
  text: string;
  onRun: (profile: string) => void;
  onDelete: (profile: string) => void;
}

function Profile({ text, onRun, onDelete }: Props) {
  if (!text) {
    return null;
  }

  return (
    <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card text-card-foreground shadow-sm hover:border-primary/40 transition-colors">
      <span className="truncate font-medium text-sm text-foreground flex-1 pr-2">
        {text}
      </span>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          type="button"
          size="sm"
          variant="default"
          onClick={() => onRun(text)}
        >
          run
        </Button>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          onClick={() => onDelete(text)}
        >
          delete
        </Button>
      </div>
    </div>
  );
}

export default Profile;

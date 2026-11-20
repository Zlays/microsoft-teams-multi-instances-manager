import {
  Button as UIButton,
  type ButtonVariant,
  type ButtonSize,
} from './ui/button';

export interface ButtonProps {
  text: string;
  click: (T: void) => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  disabled?: boolean;
}

function Button({
  text,
  click,
  variant = 'default',
  size = 'default',
  className,
  disabled,
}: ButtonProps) {
  return (
    <UIButton
      type="button"
      variant={variant}
      size={size}
      onClick={() => click()}
      className={className}
      disabled={disabled}
    >
      {text}
    </UIButton>
  );
}

export default Button;

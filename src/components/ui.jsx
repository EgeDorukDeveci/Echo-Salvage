import { AVATARS, AVATAR_BY_ID } from "../game/config.js";

function Button({ children, primary, danger, className = "", ...props }) {
  return (
    <button className={`btn ${primary ? "btn-primary" : ""} ${danger ? "btn-danger" : ""} ${className}`} {...props}>
      {children}
    </button>
  );
}

function AvatarBadge({ avatar = "yellow", size = "md" }) {
  const selected = AVATAR_BY_ID.get(avatar) || AVATARS[0];
  return (
    <span className={`avatar-badge avatar-${size}`} style={{ "--avatar-main": selected.colors[0], "--avatar-bg": selected.colors[1] }}>
      <span />
    </span>
  );
}

export { AvatarBadge, Button };

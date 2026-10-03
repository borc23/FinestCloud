/**
 * Icon Component - Font Awesome wrapper for optimized icon rendering
 * Provides tree-shakeable icons with consistent styling
 */

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faTimes,
  faFilter,
  faPlus,
  faMinus,
  faCloudUploadAlt,
  faExclamationTriangle,
  faSolarPanel,
  faSun,
  faRedoAlt,
  faUser,
  faUserCircle,
  faSignOutAlt,
  faLock,
  faSignInAlt,
  faFolder,
  faFolderOpen,
  faLocationArrow,
  faCheckCircle,
  faMapMarkerAlt,
  faSquare,
  faPenToSquare,
  faBuilding,
  faUserPlus,
  faEnvelope,
  faSpinner,
  faTrash,
  faCalendarPlus,
  faClock,
  faHouse,
  faCircleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

// Icon mapping for easy reference
const iconMap: Record<string, IconDefinition> = {
  search: faSearch,
  times: faTimes,
  filter: faFilter,
  plus: faPlus,
  minus: faMinus,
  upload: faCloudUploadAlt,
  warning: faExclamationTriangle,
  "solar-panel": faSolarPanel,
  sun: faSun,
  refresh: faRedoAlt,
  user: faUser,
  "user-circle": faUserCircle,
  "sign-out-alt": faSignOutAlt,
  logout: faSignOutAlt,
  lock: faLock,
  login: faSignInAlt,
  folder: faFolder,
  "folder-open": faFolderOpen,
  "location-arrow": faLocationArrow,
  "check-circle": faCheckCircle,
  "map-marker-alt": faMapMarkerAlt,
  "vector-square": faSquare,
  "pen-to-square": faPenToSquare,
  building: faBuilding,
  "user-plus": faUserPlus,
  envelope: faEnvelope,
  spinner: faSpinner,
  trash: faTrash,
  "calendar-plus": faCalendarPlus,
  clock: faClock,
  home: faHouse,
  "circle-exclamation": faCircleExclamation,
};

interface IconProps {
  name: keyof typeof iconMap;
  className?: string;
  size?: "xs" | "sm" | "lg" | "1x" | "2x" | "3x";
  spin?: boolean;
  pulse?: boolean;
  fixedWidth?: boolean;
  style?: React.CSSProperties;
}

/**
 * Optimized Icon component with Font Awesome
 * Replaces legacy <i className="fas fa-*"> usage with tree-shakeable React components
 */
export function Icon({
  name,
  className,
  size,
  spin,
  pulse,
  fixedWidth,
  style,
}: IconProps) {
  const icon = iconMap[name];

  if (!icon) {
    console.warn(`Icon "${name}" not found in icon map`);
    return null;
  }

  return (
    <FontAwesomeIcon
      icon={icon}
      className={className}
      size={size}
      spin={spin}
      pulse={pulse}
      fixedWidth={fixedWidth}
      style={style as any}
    />
  );
}

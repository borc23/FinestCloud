/**
 * Icon Component - Font Awesome wrapper for optimized icon rendering
 * Provides tree-shakeable icons with consistent styling
 */

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faSearch,
  faTimes,
  faFilter,
  faPlus,
  faMinus,
  faExpand,
  faCloudUploadAlt,
  faExclamationTriangle,
  faArrowLeft,
  faImage,
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
  faChevronDown,
  faSquare,
  faPenToSquare,
  faMap,
  faBuilding,
  faUserPlus,
  faUsers,
  faEnvelope,
} from '@fortawesome/free-solid-svg-icons'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'

// Icon mapping for easy reference
const iconMap: Record<string, IconDefinition> = {
  search: faSearch,
  times: faTimes,
  close: faTimes,
  filter: faFilter,
  plus: faPlus,
  minus: faMinus,
  expand: faExpand,
  'cloud-upload-alt': faCloudUploadAlt,
  upload: faCloudUploadAlt,
  'exclamation-triangle': faExclamationTriangle,
  warning: faExclamationTriangle,
  'arrow-left': faArrowLeft,
  image: faImage,
  'solar-panel': faSolarPanel,
  sun: faSun,
  'redo-alt': faRedoAlt,
  refresh: faRedoAlt,
  user: faUser,
  'user-circle': faUserCircle,
  'sign-out-alt': faSignOutAlt,
  logout: faSignOutAlt,
  lock: faLock,
  'sign-in-alt': faSignInAlt,
  login: faSignInAlt,
  folder: faFolder,
  'folder-open': faFolderOpen,
  'location-arrow': faLocationArrow,
  'check-circle': faCheckCircle,
  'map-marker-alt': faMapMarkerAlt,
  'chevron-down': faChevronDown,
  'vector-square': faSquare,
  'pen-to-square': faPenToSquare,
  map: faMap,
  building: faBuilding,
  'user-plus': faUserPlus,
  users: faUsers,
  envelope: faEnvelope,
}

interface IconProps {
  name: keyof typeof iconMap
  className?: string
  size?: 'xs' | 'sm' | 'lg' | '1x' | '2x' | '3x'
  spin?: boolean
  pulse?: boolean
  fixedWidth?: boolean
  style?: React.CSSProperties
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
  const icon = iconMap[name]

  if (!icon) {
    console.warn(`Icon "${name}" not found in icon map`)
    return null
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
  )
}

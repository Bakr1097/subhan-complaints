// Minimal stroked SVG icon set for the complaint form.
// Stroke uses currentColor so they inherit from the parent.

function Icon({ d, size = 22, stroke = 1.75, paths }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths ? paths.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
    </svg>
  );
}

const IconCar = (p) => <Icon size={p.size} paths={[
  'M5 17h14',
  'M5 17v-5l2-5h10l2 5v5',
  'M7 17v2',
  'M17 17v2',
]} />;
IconCar.extra = (p) => <Icon size={p.size} paths={[
  'M7.5 13.5h.01', 'M16.5 13.5h.01',
]} />;

const IconUserCheck = (p) => <Icon size={p.size} paths={[
  'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2',
  'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  'M17 11l2 2 4-4',
]} />;

const IconBus = (p) => <Icon size={p.size} paths={[
  'M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6z',
  'M4 11h16',
  'M8 19v2', 'M16 19v2',
  'M8 15h.01', 'M16 15h.01',
]} />;

const IconUtensils = (p) => <Icon size={p.size} paths={[
  'M7 2v9a2 2 0 0 0 4 0V2',
  'M9 2v20',
  'M17 2c-2 0-3 2-3 5v6h3v9',
]} />;

const IconClock = (p) => <Icon size={p.size} paths={[
  'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z',
  'M12 7v5l3 2',
]} />;

const IconTicket = (p) => <Icon size={p.size} paths={[
  'M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V9z',
  'M13 5v2', 'M13 11v2', 'M13 17v2',
]} />;

const IconAlert = (p) => <Icon size={p.size} paths={[
  'M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z',
  'M12 9v4', 'M12 17h.01',
]} />;

const IconLightbulb = (p) => <Icon size={p.size} paths={[
  'M9 18h6',
  'M10 22h4',
  'M12 2a7 7 0 0 0-4 12.74V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.26A7 7 0 0 0 12 2z',
]} />;

const IconCamera = (p) => <Icon size={p.size} paths={[
  'M23 7l-4 4V8a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-3l4 4V7z',
  'M9 13a3 3 0 1 0 6 0 3 3 0 0 0-6 0z',
]} />;

const IconCheck = (p) => <Icon size={p.size} paths={[
  'M20 6L9 17l-5-5',
]} />;

const IconChevronRight = (p) => <Icon size={p.size} paths={[
  'M9 6l6 6-6 6',
]} />;

const IconPhone = (p) => <Icon size={p.size} paths={[
  'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z',
]} />;

const IconCalendar = (p) => <Icon size={p.size} paths={[
  'M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z',
  'M3 11h18',
  'M8 3v4', 'M16 3v4',
]} />;

const IconRoute = (p) => <Icon size={p.size} paths={[
  'M6 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  'M18 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  'M9 8h6a4 4 0 0 1 0 8H9a4 4 0 0 0 0 8',
]} />;

const IconHash = (p) => <Icon size={p.size} paths={[
  'M4 9h16', 'M4 15h16', 'M10 3l-2 18', 'M16 3l-2 18',
]} />;

const IconShield = (p) => <Icon size={p.size} paths={[
  'M12 2L4 5v7c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V5l-8-3z',
]} />;

const IconShare = (p) => <Icon size={p.size} paths={[
  'M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7',
  'M16 6l-4-4-4 4',
  'M12 2v14',
]} />;

const IconX = (p) => <Icon size={p.size} paths={[
  'M18 6L6 18', 'M6 6l12 12',
]} />;

const IconArrowLeft = (p) => <Icon size={p.size} paths={[
  'M19 12H5', 'M12 19l-7-7 7-7',
]} />;

const IconSparkle = (p) => <Icon size={p.size} paths={[
  'M12 3l1.9 4.8L18 9.5l-4.1 1.7L12 16l-1.9-4.8L6 9.5l4.1-1.7L12 3z',
]} />;

// Subcategory icons
const IconSnowflake = (p) => <Icon size={p.size} paths={[
  'M12 2v20', 'M2 12h20',
  'M5 5l14 14', 'M19 5L5 19',
  'M9 4l3 2 3-2', 'M9 20l3-2 3 2',
  'M4 9l2 3-2 3', 'M20 9l-2 3 2 3',
]} />;

const IconPhoneOff = (p) => <Icon size={p.size} paths={[
  'M10.7 13.3a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.4 1.9.6 2.9.7A2 2 0 0 1 25 20v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3',
  'M3 3l18 18',
  'M2 4.1A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .3 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9',
]} />;

const IconFrown = (p) => <Icon size={p.size} paths={[
  'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z',
  'M16 16s-1.5-2-4-2-4 2-4 2',
  'M9 9h.01', 'M15 9h.01',
]} />;

const IconEar = (p) => <Icon size={p.size} paths={[
  'M6 8a6 6 0 1 1 12 0c0 2-1 3-2 4s-2 2-2 4a2 2 0 0 1-4 0',
  'M9 9a3 3 0 0 1 6 0',
]} />;

const IconSparkles = (p) => <Icon size={p.size} paths={[
  'M5 3v4', 'M3 5h4',
  'M19 17v4', 'M17 19h4',
  'M12 6l1.5 4L18 12l-4.5 2-1.5 4-1.5-4L6 12l4.5-2L12 6z',
]} />;

const IconArmchair = (p) => <Icon size={p.size} paths={[
  'M5 11V8a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v3',
  'M3 14a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2z',
  'M5 18v2', 'M19 18v2',
  'M8 11h8',
]} />;

const IconTablet = (p) => <Icon size={p.size} paths={[
  'M5 4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4z',
  'M11 18h2',
]} />;

const IconTimer = (p) => <Icon size={p.size} paths={[
  'M10 2h4',
  'M12 14l4-4',
  'M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16z',
]} />;

const IconMapPin = (p) => <Icon size={p.size} paths={[
  'M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z',
  'M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
]} />;

const IconStops = (p) => <Icon size={p.size} paths={[
  'M7 5a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  'M17 13a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  'M7 11v8', 'M7 19h10',
]} />;

const IconQuestion = (p) => <Icon size={p.size} paths={[
  'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z',
  'M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3',
  'M12 17h.01',
]} />;

Object.assign(window, {
  IconCar, IconUserCheck, IconBus, IconUtensils, IconClock, IconTicket,
  IconAlert, IconLightbulb, IconCamera, IconCheck, IconChevronRight,
  IconPhone, IconCalendar, IconRoute, IconHash, IconShield, IconShare,
  IconX, IconArrowLeft, IconSparkle,
  IconSnowflake, IconPhoneOff, IconFrown, IconEar, IconSparkles,
  IconArmchair, IconTablet, IconTimer, IconMapPin, IconStops, IconQuestion,
});

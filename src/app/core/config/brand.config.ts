// ═══════════════════════════════════════════════════════════════════════════
//  BRAND CONFIG  —  Edit THIS file to update your app name, contact details,
//                   and WhatsApp number everywhere at once.
//
//  Every component imports from here, so ONE change = updated globally.
// ═══════════════════════════════════════════════════════════════════════════

export const BRAND = {

  // ── Visual Identity ────────────────────────────────────────────────────────
  // nameMain + nameAccent together form the logo text in navbar / register.
  // Example: "EduManage" + " Pro"  →  EduManage Pro  (Pro is teal-coloured)
  nameMain:        'EduManage',
  nameAccent:      ' Pro',
  name:            'EduManage Pro',          // full name used in body text
  consultancyName: 'EduManage Pro Consultancy',

  // Short descriptions shown in footer / hero
  description:   'Modern institute management for the modern educator.',
  footerTagline: 'Crafted with ❤️ for Indian Educators',

  // ── Contact Details ────────────────────────────────────────────────────────
  // Change these to update EVERY email link, WhatsApp button,
  // and contact info across the landing page, register page, and FAQ.

  email: 'edumanagepro@gmail.com',    // ← your support / contact email

  phone: '',                           // optional: '+91 98765 43210'
                                       // leave empty ('') to hide phone display

  whatsapp: {
    // WhatsApp number: country code + 10-digit number, NO + sign, NO spaces.
    // Example for India:  '919876543210'  means +91 98765 43210
    number:  '918001622443',           // ← REPLACE WITH YOUR REAL NUMBER

    // Pre-filled message that opens when someone taps the WhatsApp button
    message: 'Hi! I\'m interested in EduManage Pro for my institute. Can you tell me more?',
  },

  // ── Support Info ───────────────────────────────────────────────────────────
  supportHours:  '24/7',              // shown in contact section
  responseTime:  'Within 2 hours',   // shown in contact section
  servingText:   'Institutes across India',

  // ── Social Proof Numbers ───────────────────────────────────────────────────
  // Update these as your business grows
  institutesCount:  '20+',           // shown in hero badge, footer, testimonials
  studentsManaged:  '500+',          // shown in stats bar
  uptimePercent:    99,              // shown in stats bar (numeric for animation)

  // ── Trial Config ───────────────────────────────────────────────────────────
  trialDays:        20,
  trialMaxStudents: 50,

  // ── Copyright ──────────────────────────────────────────────────────────────
  copyrightYear: 2026,               // update each January :)

} as const;

// ── Computed WhatsApp link ─────────────────────────────────────────────────
// Import this anywhere you need the full WA href  (e.g. [href]="waLink")
export const WA_LINK =
  `https://wa.me/${BRAND.whatsapp.number}?text=${encodeURIComponent(BRAND.whatsapp.message)}`;

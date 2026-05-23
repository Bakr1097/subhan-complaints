// Subhan Travels — Complaint intake form
// Modern, mobile-first, three theme directions.
// Themes are provided via window.THEMES (themes.jsx).

const ROUTES = [
{ id: 'r1', name: 'Faisalabad → Lahore', short: 'FSD → LHE' },
{ id: 'r2', name: 'Faisalabad → Karachi', short: 'FSD → KHI' },
{ id: 'r3', name: 'Faisalabad → Islamabad', short: 'FSD → ISB' },
{ id: 'r4', name: 'Faisalabad → Multan', short: 'FSD → MUX' },
{ id: 'r5', name: 'Faisalabad → Peshawar', short: 'FSD → PEW' }];


const TIMES = ['6 AM', '9 AM', '12 PM', '3 PM', '6 PM', '9 PM', '11 PM'];

const CATEGORIES = [
{ value: 'DRIVER', label: 'Driver', Icon: IconCar, severity: 'HIGH' },
{ value: 'STEWARD', label: 'Steward', Icon: IconUserCheck, severity: 'MEDIUM' },
{ value: 'BUS_CONDITION', label: 'Bus condition', Icon: IconBus, severity: 'HIGH' },
{ value: 'FOOD_DRINKS', label: 'Food & drinks', Icon: IconUtensils, severity: 'HIGH' },
{ value: 'DELAY_TIMING', label: 'Delay or timing', Icon: IconClock, severity: 'MEDIUM' },
{ value: 'TICKET_REFUND', label: 'Ticket or refund', Icon: IconTicket, severity: 'MEDIUM' },
{ value: 'OTHER_SERIOUS', label: 'Other / serious', Icon: IconAlert, severity: 'HIGH' },
{ value: 'SUGGESTION_FEEDBACK', label: 'Suggestion', Icon: IconLightbulb, severity: 'LOW', variant: 'suggestion' }];


const SUBCATEGORIES = {
  DRIVER: [
  { value: 'RECKLESS', label: 'Reckless driving', hint: 'overspeed, weaving', Icon: IconAlert },
  { value: 'MOBILE', label: 'Phone while driving', hint: 'on the road', Icon: IconPhoneOff },
  { value: 'RUDE', label: 'Rude behaviour', hint: 'with passengers', Icon: IconFrown },
  { value: 'OTHER', label: 'Other', hint: 'something else', Icon: IconQuestion }],

  STEWARD: [
  { value: 'RUDE', label: 'Rude behaviour', hint: '', Icon: IconFrown },
  { value: 'UNRESP', label: 'Unresponsive', hint: 'ignored requests', Icon: IconEar },
  { value: 'SERVICE', label: 'Poor service', hint: 'food / drinks', Icon: IconUtensils },
  { value: 'OTHER', label: 'Other', hint: '', Icon: IconQuestion }],

  BUS_CONDITION: [
  { value: 'AC', label: 'AC / heating', hint: 'not working', Icon: IconSnowflake },
  { value: 'TABLET', label: 'Entertainment tablet', hint: 'broken / off', Icon: IconTablet },
  { value: 'SEAT', label: 'Seat', hint: 'broken / unclean', Icon: IconArmchair },
  { value: 'CLEAN', label: 'Cleanliness', hint: 'overall hygiene', Icon: IconSparkles }],

  DELAY_TIMING: [
  { value: 'LATE_DEP', label: 'Late departure', hint: 'started late', Icon: IconTimer },
  { value: 'LATE_ARR', label: 'Late arrival', hint: 'arrived late', Icon: IconMapPin },
  { value: 'STOPS', label: 'Excessive stops', hint: 'slow journey', Icon: IconStops },
  { value: 'OTHER', label: 'Other', hint: 'something else', Icon: IconQuestion }]

};

// ─── tiny helpers ───────────────────────────────────────────

function formatPhone(raw) {
  const d = raw.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 4) return d;
  return d.slice(0, 4) + '-' + d.slice(4);
}

function validPhone(d) {
  return /^03\d{9}$/.test(d.replace(/\D/g, ''));
}

function todayStr() {return new Date().toISOString().slice(0, 10);}

function fmtDate(s) {
  if (!s) return '—';
  return new Date(s + 'T00:00').toLocaleDateString('en-PK', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
}

// ─── shared style helpers ───────────────────────────────────

function fieldStyle(t) {
  return {
    width: '100%',
    height: 52,
    padding: '0 16px',
    background: t.surface,
    border: `1px solid ${t.border}`,
    borderRadius: t.radiusSm,
    fontFamily: t.bodyFont,
    fontSize: 16,
    color: t.fg,
    outline: 'none',
    transition: 'border-color .15s, box-shadow .15s',
    WebkitAppearance: 'none'
  };
}

function labelStyle(t) {
  return {
    display: 'block',
    fontFamily: t.bodyFont,
    fontSize: 13,
    fontWeight: 600,
    color: t.fg,
    letterSpacing: '-0.005em',
    marginBottom: 8
  };
}

function hintStyle(t) {
  return {
    fontFamily: t.bodyFont,
    fontSize: 11.5,
    color: t.fgFaint,
    marginTop: 6,
    letterSpacing: '0.01em'
  };
}

// ─── the form ───────────────────────────────────────────────

function ComplaintForm({ tweaks }) {
  const t = window.THEMES[tweaks.direction] || window.THEMES.service;
  const dense = tweaks.density === 'compact';
  const showStrip = tweaks.trustStrip !== false;

  const [phone, setPhone] = React.useState('0312-4567890');
  const [routeId, setRouteId] = React.useState('r1');
  const [date, setDate] = React.useState(todayStr());
  const [time, setTime] = React.useState('9 PM');
  const [busNo, setBusNo] = React.useState('47');
  const [category, setCategory] = React.useState(tweaks.preselectCategory ? 'BUS_CONDITION' : '');
  const [subcat, setSubcat] = React.useState(tweaks.preselectCategory ? 'AC' : '');
  const [desc, setDesc] = React.useState('');
  const [photo, setPhoto] = React.useState(null);
  const [name, setName] = React.useState('');
  const [screen, setScreen] = React.useState(tweaks.showConfirmation ? 'confirm' : 'form');
  const [focused, setFocused] = React.useState(null);

  // Allow tweak panel to drive screen
  React.useEffect(() => {
    setScreen(tweaks.showConfirmation ? 'confirm' : 'form');
  }, [tweaks.showConfirmation]);
  React.useEffect(() => {
    if (tweaks.preselectCategory && !category) {
      setCategory('BUS_CONDITION');
      setSubcat('AC');
    }
  }, [tweaks.preselectCategory]);

  const cat = CATEGORIES.find((c) => c.value === category);
  const subs = SUBCATEGORIES[category] || null;

  function pickCategory(v) {
    setCategory(v);
    setSubcat('');
  }

  function submit() {
    setScreen('confirm');
  }

  // Confirmation view
  if (screen === 'confirm') {
    return <ConfirmScreen
      t={t}
      reference="SCT-2026-0148"
      route={ROUTES.find((r) => r.id === routeId)}
      date={date}
      time={time}
      busNo={busNo}
      onReset={() => {setScreen('form');}} />;

  }

  // Main form
  return (
    <div style={{
      minHeight: '100%',
      background: t.bg,
      backgroundImage: t.bgGrain,
      fontFamily: t.bodyFont,
      color: t.fg,
      paddingBottom: 140
    }}>
      {/* Top trust strip */}
      {showStrip &&
      <div style={{
        background: t.primary,
        color: t.primaryFg,
        fontFamily: t.bodyFont,
        fontSize: 12,
        fontWeight: 500,
        letterSpacing: '0.01em',
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginTop: 48
      }}>
          <span style={{ display: 'inline-flex', opacity: 0.9 }}>
            <IconShield size={13} />
          </span>
          <span>Your complaint goes directly to management</span>
        </div>
      }

      {/* Hero */}
      <div style={{ padding: showStrip ? '26px 20px 12px' : '70px 20px 12px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 22
        }}>
          <BrandMark t={t} size={46} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: t.headerFont,
              fontSize: 17,
              fontWeight: 700,
              color: t.fg,
              letterSpacing: t.headerCase === 'normal' ? '0.06em' : '-0.01em',
              textTransform: 'uppercase',
              lineHeight: 1
            }}>NEW SUBHAN</div>
            <div style={{
              fontFamily: t.bodyFont,
              fontSize: 11,
              color: t.fgMuted,
              letterSpacing: '0.02em',
              marginTop: 4
            }}>Passenger complaints · Faisalabad</div>
          </div>
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            paddingLeft: 12,
            borderLeft: `1px dashed ${t.borderStrong}`,
            color: t.fgMuted
          }}>
            <span style={{
              fontFamily: t.monoFont, fontSize: 8.5, fontWeight: 600,
              letterSpacing: '0.18em', lineHeight: 1
            }}>EST</span>
            <span style={{
              fontFamily: t.monoFont, fontSize: 11, fontWeight: 600,
              letterSpacing: '0.06em', color: t.fg, marginTop: 3
            }}>1997</span>
          </div>
        </div>

        <h1 style={{
          fontFamily: t.headerFont,
          fontWeight: t.titleWeight,
          fontSize: 32,
          lineHeight: 1.05,
          letterSpacing: t.headerLetter,
          color: t.fg,
          margin: '6px 0 8px',
          textWrap: 'balance'
        }}>
          {tweaks.heroLine || 'Tell us what happened.'}
        </h1>
        <p style={{
          fontFamily: t.bodyFont,
          fontSize: 14,
          lineHeight: 1.45,
          color: t.fgMuted,
          margin: 0,
          textWrap: 'pretty'
        }}>
          {t.tagline}
        </p>
        <p style={{
          fontFamily: t.bodyFont,
          fontSize: 12,
          color: t.fgFaint,
          margin: '6px 0 0',
          fontStyle: 'italic',
          letterSpacing: '0.005em'
        }}>
          {t.label}
        </p>
      </div>

      {/* Contact — first, because we need to be able to reach you */}
      <Section t={t} title="Your contact" caption="Taake hum aap se rabta kar sakein">
        <Field t={t} label="Mobile number" hint="WhatsApp pe reply ayegi" required>
          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
              color: t.fgFaint, fontFamily: t.monoFont, fontSize: 13, fontWeight: 500,
              borderRight: `1px solid ${t.border}`, paddingRight: 10,
              display: 'inline-flex', alignItems: 'center', gap: 6
            }}>+92</span>
            <input
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              placeholder="0312-4567890"
              onFocus={() => setFocused('phone')}
              onBlur={() => setFocused(null)}
              style={{
                ...fieldStyle(t),
                paddingLeft: 64,
                borderColor: focused === 'phone' ? t.primary : t.border,
                boxShadow: focused === 'phone' ? `0 0 0 4px ${t.primary}1A` : 'none'
              }} />
          </div>
        </Field>

        <Field t={t} label="Your name" hint="Optional — agar batana chahein" optional>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            onFocus={() => setFocused('name')}
            onBlur={() => setFocused(null)}
            style={{
              ...fieldStyle(t),
              borderColor: focused === 'name' ? t.primary : t.border,
              boxShadow: focused === 'name' ? `0 0 0 4px ${t.primary}1A` : 'none'
            }} />
        </Field>
      </Section>

      {/* Trip block */}
      <Section t={t} title="Your trip" caption="Safar ki tafseel">
        <JourneyStrip
          t={t}
          route={ROUTES.find((r) => r.id === routeId)}
          date={date}
          time={time}
          busNo={busNo} />
        

        <Field t={t} label="Route" hint="Apna safar ka rasta" required>
          <RouteSelect t={t} value={routeId} onChange={setRouteId} />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr minmax(0, 1fr)', gap: 10 }}>
          <Field t={t} label="Travel date" required>
            <DateInput t={t} value={date} onChange={setDate} focused={focused === 'date'}
            onFocus={() => setFocused('date')} onBlur={() => setFocused(null)} />
          </Field>
          <Field t={t} label="Departure" required>
            <TimeSelect t={t} value={time} onChange={setTime} />
          </Field>
        </div>

        <Field t={t} label="Bus number" hint='Ticket ya bus par likha number. Naa ho to "unknown"'>
          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
              color: t.fgFaint, display: 'inline-flex'
            }}>
              <IconHash size={16} />
            </span>
            <input
              type="text"
              value={busNo}
              onChange={(e) => setBusNo(e.target.value)}
              placeholder="e.g. 47"
              onFocus={() => setFocused('bus')}
              onBlur={() => setFocused(null)}
              style={{
                ...fieldStyle(t),
                paddingLeft: 40,
                borderColor: focused === 'bus' ? t.primary : t.border,
                boxShadow: focused === 'bus' ? `0 0 0 4px ${t.primary}1A` : 'none'
              }} />
            
          </div>
        </Field>
      </Section>

      {/* Category block */}
      <Section t={t} title="What happened?" caption="Kya masla hua?">
        <CategoryGrid
          t={t}
          value={category}
          onChange={pickCategory}
          iconStyle={tweaks.iconStyle || 'soft'} />
        

        {subs &&
        <div style={{
          marginTop: 16,
          background: t.surfaceMuted,
          border: `1px solid ${t.border}`,
          borderRadius: t.radius,
          padding: '14px 14px 16px',
          animation: 'subcatIn 280ms cubic-bezier(.2,.7,.2,1)'
        }}>
            <div style={{
            fontFamily: t.bodyFont,
            fontSize: 11.5,
            fontWeight: 600,
            color: t.fgMuted,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
              <span style={{
              width: 6, height: 6, borderRadius: 100, background: t.primary
            }} />
              {cat.label} · specifics
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 10,
            }}>
              {subs.map((s) =>
            <SubcatPill key={s.value} t={t} entry={s}
            selected={subcat === s.value}
            onClick={() => setSubcat(s.value)} />
            )}
            </div>
          </div>
        }

        {/* severity indicator once chosen */}
        {cat &&
        <SeverityBar t={t} severity={cat.severity} variant={cat.variant} />
        }

        <Field t={t} label="Tell us more" hint={`Mukhtasar tafseel · ${desc.length}/500`} optional>
          <div style={{ position: 'relative' }}>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value.slice(0, 500))}
              placeholder="Bus number, time, what the driver/steward did, what happened on the route..."
              rows={4}
              onFocus={() => setFocused('desc')}
              onBlur={() => setFocused(null)}
              style={{
                ...fieldStyle(t),
                height: 'auto',
                padding: '14px 16px',
                resize: 'none',
                lineHeight: 1.45,
                borderColor: focused === 'desc' ? t.primary : t.border,
                boxShadow: focused === 'desc' ? `0 0 0 4px ${t.primary}1A` : 'none'
              }} />
            
          </div>
        </Field>

        <Field t={t} label="Add a photo" hint="Max 5MB · optional" optional>
          <PhotoSlot t={t} photo={photo} setPhoto={setPhoto} />
        </Field>
      </Section>

      {/* Fixed submit dock */}
      <div style={{
        position: 'absolute',
        left: 0, right: 0, bottom: 34,
        padding: '12px 16px 12px',
        background: `linear-gradient(180deg, ${t.bg}00 0%, ${t.bg} 35%)`,
        zIndex: 5
      }}>
        <button
          onClick={submit}
          style={{
            width: '100%',
            height: 56,
            border: 'none',
            background: t.primary,
            color: t.primaryFg,
            fontFamily: t.bodyFont,
            fontSize: 16,
            fontWeight: 600,
            letterSpacing: '-0.005em',
            borderRadius: t.radius,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            boxShadow: `0 8px 20px ${t.primary}33, 0 1px 0 inset rgba(255,255,255,0.12)`,
            transition: 'transform .12s, box-shadow .12s'
          }}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.985)'}
          onMouseUp={(e) => e.currentTarget.style.transform = ''}>
          
          <span>Submit complaint</span>
          <IconChevronRight size={18} />
        </button>
        <div style={{
          textAlign: 'center',
          marginTop: 8,
          fontFamily: t.bodyFont,
          fontSize: 11,
          color: t.fgFaint,
          letterSpacing: '0.02em'
        }}>
          Reference generated instantly · response within 24 hours
        </div>
      </div>

      <style>{`
        @keyframes subcatIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes catPop {
          0%   { transform: scale(1); }
          40%  { transform: scale(0.96); }
          100% { transform: scale(1); }
        }
        select::-ms-expand { display: none; }
        textarea, input { font-family: inherit; }
      `}</style>
    </div>);

}

// ─── sub-components ─────────────────────────────────────────

function BrandMark({ t, size = 44 }) {
  return (
    <div style={{
      width: size, height: size,
      borderRadius: 100,
      background: t.primary,
      color: t.primaryFg,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: `0 6px 18px ${t.primary}48, inset 0 1px 0 rgba(255,255,255,0.18)`,
      position: 'relative',
      flexShrink: 0
    }}>
      <IconBus size={Math.round(size * 0.5)} />
      <span style={{
        position: 'absolute', inset: 0, borderRadius: 100,
        background: 'linear-gradient(160deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 50%)',
        pointerEvents: 'none'
      }} />
    </div>);

}

// Origin → destination journey strip (the "ticket header" feel)
function JourneyStrip({ t, route, date, time, busNo }) {
  if (!route) return null;
  const dateLabel = date ?
  new Date(date + 'T00:00').toLocaleDateString('en-PK', {
    weekday: 'short', day: 'numeric', month: 'short'
  }).toUpperCase() :
  '—';
  const [origCity, destCity] = route.name.split(' → ');
  const [origCode, destCode] = route.short.split(' → ');
  return (
    <div style={{
      position: 'relative',
      background: t.surface,
      border: `1px solid ${t.border}`,
      borderRadius: t.radiusLg,
      padding: '16px 18px 14px',
      boxShadow: `0 10px 28px ${t.primary}10, 0 1px 0 rgba(255,255,255,0.4) inset`,
      overflow: 'hidden'
    }}>
      {/* Punched corners — ticket feel */}
      <span style={{
        position: 'absolute', left: -7, top: '52%', width: 14, height: 14,
        borderRadius: 100, background: t.bg,
        border: `1px solid ${t.border}`, borderLeft: 'none'
      }} />
      <span style={{
        position: 'absolute', right: -7, top: '52%', width: 14, height: 14,
        borderRadius: 100, background: t.bg,
        border: `1px solid ${t.border}`, borderRight: 'none'
      }} />

      {/* Top: SERVICE label + date */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        marginBottom: 14
      }}>
        <span style={{
          fontFamily: t.bodyFont, fontSize: 10, fontWeight: 700,
          color: t.fgMuted, textTransform: 'uppercase', letterSpacing: '0.18em'
        }}>Your journey</span>
        <span style={{
          fontFamily: t.monoFont, fontSize: 10.5, color: t.fgFaint,
          letterSpacing: '0.1em'
        }}>{dateLabel}</span>
      </div>

      {/* Route line: code · pin ── dashes ── pin · code */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        alignItems: 'center',
        gap: 12
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
          <span style={{
            fontFamily: t.headerFont, fontSize: 26, fontWeight: t.titleWeight,
            color: t.fg, letterSpacing: '-0.02em', lineHeight: 1
          }}>{origCode}</span>
          <span style={{
            fontFamily: t.bodyFont, fontSize: 10.5, color: t.fgMuted,
            textTransform: 'uppercase', letterSpacing: '0.1em'
          }}>{origCity}</span>
        </div>

        <RoadDashes t={t} />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
          <span style={{
            fontFamily: t.headerFont, fontSize: 26, fontWeight: t.titleWeight,
            color: t.fg, letterSpacing: '-0.02em', lineHeight: 1
          }}>{destCode}</span>
          <span style={{
            fontFamily: t.bodyFont, fontSize: 10.5, color: t.fgMuted,
            textTransform: 'uppercase', letterSpacing: '0.1em'
          }}>{destCity}</span>
        </div>
      </div>

      {/* Bottom strip: time · bus# */}
      <div style={{
        marginTop: 14, paddingTop: 12,
        borderTop: `1px dashed ${t.borderStrong}`,
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: 12
      }}>
        <div>
          <div style={{
            fontFamily: t.bodyFont, fontSize: 9.5, fontWeight: 700,
            color: t.fgFaint, textTransform: 'uppercase', letterSpacing: '0.14em',
            marginBottom: 3
          }}>Departure</div>
          <div style={{
            fontFamily: t.monoFont, fontSize: 14, fontWeight: 500, color: t.fg,
            display: 'flex', alignItems: 'center', gap: 6
          }}>
            <span style={{ color: t.fgMuted, display: 'inline-flex' }}><IconClock size={13} /></span>
            {time || '—'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontFamily: t.bodyFont, fontSize: 9.5, fontWeight: 700,
            color: t.fgFaint, textTransform: 'uppercase', letterSpacing: '0.14em',
            marginBottom: 3
          }}>Bus</div>
          <div style={{
            fontFamily: t.monoFont, fontSize: 14, fontWeight: 500, color: t.fg,
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6
          }}>
            <span style={{ color: t.fgMuted, display: 'inline-flex' }}><IconHash size={12} /></span>
            {busNo || 'unknown'}
          </div>
        </div>
      </div>
    </div>);

}

function RoadDashes({ t }) {
  return (
    <div style={{
      position: 'relative', height: 24,
      display: 'flex', alignItems: 'center'
    }}>
      {/* origin pin */}
      <span style={{
        position: 'absolute', left: -4, top: '50%', transform: 'translate(-50%, -50%)',
        width: 12, height: 12, borderRadius: 100,
        background: t.surface,
        border: `2.5px solid ${t.primary}`,
        boxShadow: `0 0 0 3px ${t.primary}20`
      }} />
      {/* destination pin */}
      <span style={{
        position: 'absolute', right: -4, top: '50%', transform: 'translate(50%, -50%)',
        width: 12, height: 12, borderRadius: 100,
        background: t.primary,
        boxShadow: `0 0 0 3px ${t.primary}20`
      }} />
      {/* road dashes */}
      <div style={{
        flex: 1, height: 2,
        background: `repeating-linear-gradient(90deg, ${t.borderStrong} 0 6px, transparent 6px 12px)`,
        margin: '0 10px'
      }} />
      {/* tiny bus glyph on the road */}
      <span style={{
        position: 'absolute', left: '50%', top: '50%',
        transform: 'translate(-50%, -50%)',
        background: t.surface,
        padding: '2px 4px',
        borderRadius: 6,
        border: `1px solid ${t.border}`,
        color: t.primary,
        display: 'inline-flex'
      }}>
        <IconBus size={14} />
      </span>
    </div>);

}

function Section({ t, title, caption, optional, children }) {
  return (
    <section style={{ padding: '18px 20px 6px' }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', gap: 10,
        marginBottom: 14,
        paddingBottom: 8,
        borderBottom: `1px dashed ${t.border}`
      }}>
        <h2 style={{
          margin: 0,
          fontFamily: t.headerFont,
          fontWeight: t.titleWeight,
          fontSize: 18,
          letterSpacing: t.headerLetter,
          color: t.fg
        }}>{title}</h2>
        {caption &&
        <span style={{
          fontFamily: t.bodyFont,
          fontSize: 11.5,
          color: t.fgFaint,
          fontStyle: 'italic',
          letterSpacing: '0.005em',
          flex: 1
        }}>{caption}</span>
        }
        {optional &&
        <span style={{
          fontFamily: t.bodyFont,
          fontSize: 10,
          fontWeight: 600,
          color: t.fgMuted,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          background: t.chip,
          padding: '3px 8px',
          borderRadius: 100
        }}>Optional</span>
        }
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {children}
      </div>
    </section>);

}

function Field({ t, label, hint, required, optional, children }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
        <label style={{ ...labelStyle(t), marginBottom: 0 }}>{label}</label>
        {required && <span style={{
          color: t.danger, fontSize: 11, fontWeight: 600, letterSpacing: '0.02em'
        }}>*</span>}
        {optional && <span style={{
          fontFamily: t.bodyFont, fontSize: 10.5,
          color: t.fgFaint, textTransform: 'uppercase', letterSpacing: '0.1em'
        }}>optional</span>}
      </div>
      {children}
      {hint && <div style={hintStyle(t)}>{hint}</div>}
    </div>);

}

function RouteSelect({ t, value, onChange }) {
  const r = ROUTES.find((x) => x.id === value);
  const [open, setOpen] = React.useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          ...fieldStyle(t),
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          cursor: 'pointer',
          borderColor: open ? t.primary : t.border,
          boxShadow: open ? `0 0 0 4px ${t.primary}1A` : 'none'
        }}>
        
        <span style={{ color: t.fgMuted, display: 'inline-flex' }}>
          <IconRoute size={18} />
        </span>
        <span style={{
          flex: 1,
          minWidth: 0,
          fontSize: 15,
          color: t.fg,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>{r?.name || 'Select route'}</span>
        <span style={{
          fontFamily: t.monoFont, fontSize: 11, color: t.fgFaint,
          background: t.chip, padding: '3px 7px', borderRadius: 6,
          letterSpacing: '0.04em'
        }}>{r?.short}</span>
      </button>
      {open &&
      <div style={{
        position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
        background: t.surface, border: `1px solid ${t.border}`,
        borderRadius: t.radiusSm, overflow: 'hidden', zIndex: 10,
        boxShadow: '0 12px 30px rgba(0,0,0,0.12)'
      }}>
          {ROUTES.map((r, i) =>
        <button
          key={r.id}
          type="button"
          onClick={() => {onChange(r.id);setOpen(false);}}
          style={{
            width: '100%', textAlign: 'left',
            padding: '12px 14px',
            background: value === r.id ? t.accentSoft : 'transparent',
            border: 'none',
            borderTop: i > 0 ? `1px solid ${t.border}` : 'none',
            fontFamily: t.bodyFont, fontSize: 14, color: t.fg,
            display: 'flex', alignItems: 'center', gap: 10,
            cursor: 'pointer'
          }}>
          
              <span style={{ flex: 1 }}>{r.name}</span>
              <span style={{
            fontFamily: t.monoFont, fontSize: 11, color: t.fgMuted
          }}>{r.short}</span>
            </button>
        )}
        </div>
      }
    </div>);

}

function DateInput({ t, value, onChange, focused, onFocus, onBlur }) {
  return (
    <div style={{ position: 'relative' }}>
      <span style={{
        position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
        color: t.fgMuted, display: 'inline-flex', pointerEvents: 'none'
      }}>
        <IconCalendar size={16} />
      </span>
      <input
        type="date"
        value={value}
        max={todayStr()}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        style={{
          ...fieldStyle(t),
          paddingLeft: 40,
          fontFamily: t.monoFont,
          fontSize: 14,
          borderColor: focused ? t.primary : t.border,
          boxShadow: focused ? `0 0 0 4px ${t.primary}1A` : 'none'
        }} />
      
    </div>);

}

function TimeSelect({ t, value, onChange }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          ...fieldStyle(t),
          display: 'flex', alignItems: 'center', gap: 10,
          cursor: 'pointer',
          borderColor: open ? t.primary : t.border,
          boxShadow: open ? `0 0 0 4px ${t.primary}1A` : 'none'
        }}>
        
        <span style={{ color: t.fgMuted, display: 'inline-flex' }}>
          <IconClock size={16} />
        </span>
        <span style={{ flex: 1, fontFamily: t.monoFont, fontSize: 14, color: t.fg }}>{value}</span>
      </button>
      {open &&
      <div style={{
        position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
        background: t.surface, border: `1px solid ${t.border}`,
        borderRadius: t.radiusSm, overflow: 'hidden', zIndex: 10,
        boxShadow: '0 12px 30px rgba(0,0,0,0.12)'
      }}>
          {TIMES.map((tm, i) =>
        <button
          key={tm}
          type="button"
          onClick={() => {onChange(tm);setOpen(false);}}
          style={{
            width: '100%', textAlign: 'left',
            padding: '11px 14px',
            background: value === tm ? t.accentSoft : 'transparent',
            border: 'none',
            borderTop: i > 0 ? `1px solid ${t.border}` : 'none',
            fontFamily: t.monoFont, fontSize: 13, color: t.fg,
            cursor: 'pointer'
          }}>
          {tm}</button>
        )}
        </div>
      }
    </div>);

}

function CategoryGrid({ t, value, onChange, iconStyle }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
      gap: 10
    }}>
      {CATEGORIES.map((c, i) => {
        const selected = value === c.value;
        const isSuggestion = c.variant === 'suggestion';
        return (
          <button
            key={c.value}
            type="button"
            onClick={() => onChange(c.value)}
            style={{
              position: 'relative',
              padding: '14px 12px',
              minHeight: 92,
              background: selected ?
              isSuggestion ? t.accent : t.primary :
              t.surface,
              color: selected ?
              t.primaryFg :
              t.fg,
              border: `1px solid ${
              selected ? 'transparent' :
              isSuggestion ? t.accent + '55' : t.border}`,

              borderRadius: t.radius,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 12,
              textAlign: 'left',
              fontFamily: t.bodyFont,
              transition: 'background .15s, border-color .15s, transform .15s',
              boxShadow: selected ?
              `0 6px 16px ${isSuggestion ? t.accent : t.primary}40` :
              'none',
              animation: selected ? 'catPop 240ms cubic-bezier(.34,1.56,.64,1)' : undefined
            }}>
            
            <span style={{
              display: 'inline-flex',
              alignItems: 'center', justifyContent: 'center',
              width: iconStyle === 'soft' ? 38 : 30,
              height: iconStyle === 'soft' ? 38 : 30,
              borderRadius: iconStyle === 'soft' ? t.radiusSm : 0,
              background: iconStyle === 'soft' && !selected ?
              isSuggestion ? t.accentSoft : t.surfaceMuted :
              'transparent',
              color: selected ?
              t.primaryFg :
              isSuggestion ? t.accent : t.primary
            }}>
              <c.Icon size={iconStyle === 'soft' ? 22 : 24} />
            </span>
            <span style={{
              fontSize: 13.5,
              fontWeight: 600,
              letterSpacing: '-0.005em',
              lineHeight: 1.2,
              overflowWrap: 'anywhere',
              wordBreak: 'break-word',
              maxWidth: '100%',
            }}>{c.label}</span>
            <span style={{
              position: 'absolute', top: 12, right: 12,
              width: 14, height: 14, borderRadius: 100,
              background: selected ?
              'rgba(255,255,255,0.22)' :
              t.surfaceMuted,
              color: selected ? t.primaryFg : t.fgFaint,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 8,
              opacity: selected ? 1 : 0,
              transition: 'opacity .15s'
            }}>
                <IconCheck size={9} />
              </span>
          </button>);

      })}
    </div>);

}

function SubcatPill({ t, entry, selected, onClick }) {
  const style = t.pillStyle;
  const radius = style === 'capsule' ? 24 :
                 style === 'square'  ? t.radiusSm :
                                       t.radius;
  const Icon = entry.Icon;
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '14px 14px',
        minHeight: 76,
        background: selected ? t.primary : t.surface,
        color: selected ? t.primaryFg : t.fg,
        border: `1px solid ${selected ? 'transparent' : t.border}`,
        borderRadius: radius,
        cursor: 'pointer',
        fontFamily: t.bodyFont,
        textAlign: 'left',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: selected ? `0 4px 12px ${t.primary}30` : 'none',
        transition: 'background .15s, border-color .15s, box-shadow .15s',
      }}>
      {Icon && (
        <span style={{
          flexShrink: 0,
          width: 36, height: 36,
          borderRadius: t.radiusSm,
          background: selected ? 'rgba(255,255,255,0.16)' : t.surfaceMuted,
          color: selected ? t.primaryFg : t.primary,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Icon size={20} />
        </span>
      )}
      <span style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        minWidth: 0,
        flex: 1,
      }}>
        <span style={{
          fontSize: 13.5,
          fontWeight: 600,
          lineHeight: 1.2,
          letterSpacing: '-0.005em',
          overflowWrap: 'anywhere',
          wordBreak: 'break-word',
        }}>{entry.label}</span>
        {entry.hint && (
          <span style={{
            fontSize: 10.5,
            fontWeight: 500,
            opacity: selected ? 0.78 : 0.65,
            color: selected ? t.primaryFg : t.fgMuted,
            letterSpacing: '0.005em',
            lineHeight: 1.25,
            overflowWrap: 'anywhere',
            wordBreak: 'break-word',
          }}>{entry.hint}</span>
        )}
      </span>
    </button>);

}

function SeverityBar({ t, severity, variant }) {
  const map = {
    HIGH: { lvl: 3, label: 'High priority', color: t.danger, note: 'Flagged to admin' },
    MEDIUM: { lvl: 2, label: 'Medium priority', color: t.accent, note: 'Routed to steward head' },
    LOW: { lvl: 1, label: 'Low priority', color: t.success, note: 'Logged for review' }
  };
  if (variant === 'suggestion') {
    return (
      <div style={{
        background: t.accentSoft,
        border: `1px dashed ${t.accent}60`,
        borderRadius: t.radiusSm,
        padding: '10px 12px',
        display: 'flex', alignItems: 'center', gap: 10,
        marginTop: -4
      }}>
        <span style={{ color: t.accent, display: 'inline-flex' }}>
          <IconSparkle size={16} />
        </span>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: t.bodyFont, fontSize: 12, fontWeight: 600, color: t.fg
          }}>Suggestion · thank you</div>
          <div style={{ fontSize: 11, color: t.fgMuted }}>Shared with the ops team weekly</div>
        </div>
      </div>);

  }
  const s = map[severity];
  return (
    <div style={{
      background: t.surface,
      border: `1px solid ${t.border}`,
      borderRadius: t.radiusSm,
      padding: '10px 12px',
      display: 'flex', alignItems: 'center', gap: 12,
      marginTop: -4
    }}>
      <div style={{ display: 'flex', gap: 3 }}>
        {[1, 2, 3].map((n) =>
        <span key={n} style={{
          width: 7, height: 18,
          borderRadius: 2,
          background: n <= s.lvl ? s.color : t.border
        }} />
        )}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{
          fontFamily: t.bodyFont, fontSize: 12.5, fontWeight: 600, color: t.fg,
          letterSpacing: '-0.005em'
        }}>{s.label}</div>
        <div style={{ fontSize: 11, color: t.fgMuted, marginTop: 1 }}>{s.note}</div>
      </div>
      <span style={{
        fontFamily: t.monoFont, fontSize: 10.5, color: t.fgFaint,
        background: t.chip, padding: '3px 7px', borderRadius: 4,
        letterSpacing: '0.06em'
      }}>AUTO</span>
    </div>);

}

function PhotoSlot({ t, photo, setPhoto }) {
  if (photo) {
    return (
      <div style={{
        position: 'relative',
        height: 120,
        background: `repeating-linear-gradient(135deg, ${t.surfaceMuted} 0 10px, ${t.chip} 10px 20px)`,
        borderRadius: t.radiusSm,
        border: `1px solid ${t.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: t.monoFont, fontSize: 11, color: t.fgMuted,
        letterSpacing: '0.06em'
      }}>
        <span style={{ background: t.surface, padding: '4px 10px', borderRadius: 6, border: `1px solid ${t.border}` }}>
          PHOTO_ATTACHED.JPG
        </span>
        <button
          type="button"
          onClick={() => setPhoto(null)}
          style={{
            position: 'absolute', top: 8, right: 8,
            width: 26, height: 26, borderRadius: 100,
            background: t.fg, color: t.bg,
            border: 'none', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
          }}>
          
          <IconX size={12} />
        </button>
      </div>);

  }
  return (
    <button
      type="button"
      onClick={() => setPhoto('mock.jpg')}
      style={{
        width: '100%',
        height: 84,
        background: t.surface,
        border: `1.5px dashed ${t.borderStrong}`,
        borderRadius: t.radiusSm,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '0 18px',
        fontFamily: t.bodyFont,
        color: t.fgMuted
      }}>
      
      <span style={{
        width: 44, height: 44, borderRadius: t.radiusSm,
        background: t.surfaceMuted, color: t.fg,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <IconCamera size={20} />
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: t.fg }}>Add a photo</span>
        <span style={{ fontSize: 11, color: t.fgFaint }}>Camera · gallery · max 5 MB</span>
      </span>
    </button>);

}

// ─── confirmation screen ────────────────────────────────────

function ConfirmScreen({ t, reference, route, date, time, busNo, onReset }) {
  const dateLabel = date ?
  new Date(date + 'T00:00').toLocaleDateString('en-PK', {
    weekday: 'short', day: 'numeric', month: 'short'
  }).toUpperCase() :
  '—';
  const [origCity, destCity] = (route?.name || '— → —').split(' → ');
  const [origCode, destCode] = (route?.short || '— → —').split(' → ');

  return (
    <div style={{
      minHeight: '100%',
      background: t.bg,
      backgroundImage: t.bgGrain,
      fontFamily: t.bodyFont,
      color: t.fg,
      padding: '60px 18px 40px',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Check mark */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <div style={{
          width: 60, height: 60, borderRadius: 100,
          background: t.primary, color: t.primaryFg,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 10px 26px ${t.primary}55`,
          position: 'relative'
        }}>
          <IconCheck size={26} />
          <span style={{ position: 'absolute', inset: -7, borderRadius: 100, border: `1px solid ${t.primary}40` }} />
          <span style={{ position: 'absolute', inset: -16, borderRadius: 100, border: `1px solid ${t.primary}18` }} />
        </div>
      </div>

      <h1 style={{
        fontFamily: t.headerFont, fontWeight: t.titleWeight, fontSize: 26,
        lineHeight: 1.1, letterSpacing: t.headerLetter,
        margin: '0 0 4px', textAlign: 'center', color: t.fg
      }}>Complaint received</h1>
      <p style={{
        fontFamily: t.bodyFont, fontSize: 13, color: t.fgMuted,
        textAlign: 'center', margin: '0 0 22px'
      }}>Aap ki shikayat hum tak pohanch gayi hai</p>

      {/* Receipt-style ticket */}
      <div style={{ position: 'relative' }}>
        <SerratedEdge t={t} top />

        <div style={{
          background: t.surface,
          padding: '20px 22px 4px',
          borderLeft: `1px solid ${t.border}`,
          borderRight: `1px solid ${t.border}`,
          boxShadow: `0 18px 40px ${t.primary}12`
        }}>
          {/* Brand row */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            paddingBottom: 14, borderBottom: `1px solid ${t.border}`
          }}>
            <BrandMark t={t} size={32} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: t.headerFont, fontSize: 12, fontWeight: 700,
                color: t.fg, textTransform: 'uppercase', letterSpacing: '0.14em'
              }}>Subhan Travels</div>
              <div style={{
                fontFamily: t.monoFont, fontSize: 9.5, color: t.fgFaint,
                letterSpacing: '0.1em', marginTop: 2, textTransform: 'uppercase'
              }}>Complaint receipt</div>
            </div>
            <div style={{
              fontFamily: t.monoFont, fontSize: 10, color: t.fgMuted,
              letterSpacing: '0.1em'
            }}>{dateLabel}</div>
          </div>

          {/* Route viz */}
          <div style={{ padding: '18px 0 14px' }}>
            <div style={{
              display: 'grid', gridTemplateColumns: 'auto 1fr auto',
              alignItems: 'center', gap: 10
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                <span style={{
                  fontFamily: t.headerFont, fontSize: 24, fontWeight: t.titleWeight,
                  color: t.fg, letterSpacing: '-0.02em', lineHeight: 1
                }}>{origCode}</span>
                <span style={{
                  fontFamily: t.bodyFont, fontSize: 9.5, color: t.fgMuted,
                  textTransform: 'uppercase', letterSpacing: '0.12em'
                }}>{origCity}</span>
              </div>
              <RoadDashes t={t} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                <span style={{
                  fontFamily: t.headerFont, fontSize: 24, fontWeight: t.titleWeight,
                  color: t.fg, letterSpacing: '-0.02em', lineHeight: 1
                }}>{destCode}</span>
                <span style={{
                  fontFamily: t.bodyFont, fontSize: 9.5, color: t.fgMuted,
                  textTransform: 'uppercase', letterSpacing: '0.12em'
                }}>{destCity}</span>
              </div>
            </div>
          </div>

          {/* Perforation row */}
          <div style={{
            position: 'relative', height: 1,
            background: `repeating-linear-gradient(90deg, ${t.borderStrong} 0 5px, transparent 5px 10px)`,
            margin: '0 -22px'
          }}>
            <span style={{
              position: 'absolute', left: -8, top: -7, width: 14, height: 14,
              borderRadius: 100, background: t.bg, border: `1px solid ${t.border}`
            }} />
            <span style={{
              position: 'absolute', right: -8, top: -7, width: 14, height: 14,
              borderRadius: 100, background: t.bg, border: `1px solid ${t.border}`
            }} />
          </div>

          {/* Reference */}
          <div style={{ padding: '16px 0 14px', textAlign: 'center' }}>
            <div style={{
              fontFamily: t.bodyFont, fontSize: 9.5, fontWeight: 700,
              color: t.fgFaint, textTransform: 'uppercase', letterSpacing: '0.2em',
              marginBottom: 6
            }}>Reference number</div>
            <div style={{
              fontFamily: t.monoFont, fontSize: 24, fontWeight: 500,
              color: t.primary, letterSpacing: '0.04em'
            }}>{reference}</div>
            <div style={{
              fontFamily: t.bodyFont, fontSize: 10.5, color: t.fgFaint,
              marginTop: 6, fontStyle: 'italic'
            }}>Screenshot to track later</div>
          </div>

          {/* Trip details */}
          <div style={{
            borderTop: `1px dashed ${t.borderStrong}`,
            paddingTop: 12, paddingBottom: 16,
            display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10
          }}>
            <ReceiptMeta t={t} label="Date" value={dateLabel.split(' ').slice(1).join(' ')} mono />
            <ReceiptMeta t={t} label="Time" value={time || '—'} mono />
            <ReceiptMeta t={t} label="Bus" value={`#${busNo || '—'}`} mono />
          </div>

          <BarcodeStrip t={t} value={reference} />
        </div>

        <SerratedEdge t={t} />
      </div>

      {/* what's next */}
      <div style={{
        marginTop: 22, background: t.surfaceMuted,
        border: `1px solid ${t.border}`, borderRadius: t.radius, padding: 16
      }}>
        <div style={{
          fontFamily: t.bodyFont, fontSize: 11, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.14em',
          color: t.fgMuted, marginBottom: 12
        }}>What happens next</div>
        <TimelineStep t={t} n={1} title="Auto-triaged" sub="Sent to the right team in seconds" done />
        <TimelineStep t={t} n={2} title="We investigate" sub="Within 24 hours, on WhatsApp" />
        <TimelineStep t={t} n={3} title="Resolution + follow-up" sub="Plus a satisfaction check" last />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, marginTop: 16 }}>
        <button type="button" style={{
          height: 50, borderRadius: t.radius, background: t.surface,
          border: `1px solid ${t.border}`, color: t.fg,
          fontFamily: t.bodyFont, fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8
        }}>
          <IconShare size={14} />
          Share
        </button>
        <button type="button" style={{
          height: 50, borderRadius: t.radius, background: t.primary, color: t.primaryFg,
          border: 'none', fontFamily: t.bodyFont, fontSize: 13.5, fontWeight: 600,
          cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
          justifyContent: 'center', gap: 8, boxShadow: `0 8px 20px ${t.primary}33`
        }}>
          Track status
          <IconChevronRight size={14} />
        </button>
      </div>

      <button type="button" onClick={onReset} style={{
        marginTop: 14, background: 'transparent', border: 'none',
        color: t.fgMuted, fontFamily: t.bodyFont, fontSize: 12, fontWeight: 500,
        textDecoration: 'underline', textDecorationColor: t.borderStrong,
        textUnderlineOffset: 4, cursor: 'pointer'
      }}>← Back to the form</button>
    </div>);

}

function SerratedEdge({ t, top }) {
  const id = `tooth-${top ? 't' : 'b'}-${t.primary.replace('#', '')}`;
  return (
    <div style={{
      height: 10, position: 'relative', display: 'block',
      [top ? 'marginBottom' : 'marginTop']: -1
    }}>
      <svg width="100%" height="10" preserveAspectRatio="none" style={{ display: 'block' }}>
        <defs>
          <pattern id={id} width="14" height="10" patternUnits="userSpaceOnUse">
            {top ?
            <polygon points="0,10 7,0 14,10" fill={t.surface} stroke={t.border} strokeWidth="1" /> :
            <polygon points="0,0 7,10 14,0" fill={t.surface} stroke={t.border} strokeWidth="1" />
            }
          </pattern>
        </defs>
        <rect width="100%" height="10" fill={`url(#${id})`} />
      </svg>
    </div>);

}

function BarcodeStrip({ t, value }) {
  const bars = [];
  for (let i = 0; i < 60; i++) {
    const ch = value.charCodeAt(i % value.length);
    const w = ch % 4 + 1;
    const isGap = (ch + i) % 5 === 0;
    bars.push({ w, isGap });
  }
  return (
    <div style={{
      borderTop: `1px solid ${t.border}`,
      paddingTop: 12, paddingBottom: 4,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 1, height: 32 }}>
        {bars.map((b, i) =>
        <span key={i} style={{
          width: b.w, height: '100%',
          background: b.isGap ? 'transparent' : t.fg
        }} />
        )}
      </div>
      <div style={{
        fontFamily: t.monoFont, fontSize: 9.5,
        color: t.fgFaint, letterSpacing: '0.3em'
      }}>{value}</div>
    </div>);

}

function ReceiptMeta({ t, label, value, mono }) {
  return (
    <div>
      <div style={{
        fontFamily: t.bodyFont, fontSize: 9,
        color: t.fgFaint, textTransform: 'uppercase',
        letterSpacing: '0.14em', fontWeight: 700, marginBottom: 3
      }}>{label}</div>
      <div style={{
        fontFamily: mono ? t.monoFont : t.bodyFont,
        fontSize: 13, fontWeight: 500, color: t.fg,
        letterSpacing: mono ? '0.02em' : '-0.005em'
      }}>{value}</div>
    </div>);

}

function Meta({ t, label, value, mono }) {
  return (
    <div>
      <div style={{
        fontFamily: t.bodyFont, fontSize: 10,
        color: t.fgFaint, textTransform: 'uppercase',
        letterSpacing: '0.12em', fontWeight: 600,
        marginBottom: 4
      }}>{label}</div>
      <div style={{
        fontFamily: mono ? t.monoFont : t.bodyFont,
        fontSize: 14, fontWeight: 600,
        color: t.fg, letterSpacing: mono ? '0.02em' : '-0.005em'
      }}>{value}</div>
    </div>);

}

function TimelineStep({ t, n, title, sub, done, last }) {
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: last ? 0 : 14, position: 'relative' }}>
      <div style={{
        flexShrink: 0,
        width: 28, height: 28, borderRadius: 100,
        background: done ? t.primary : t.surface,
        color: done ? t.primaryFg : t.fgMuted,
        border: `1px solid ${done ? t.primary : t.borderStrong}`,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: t.monoFont, fontSize: 11, fontWeight: 600,
        position: 'relative', zIndex: 1
      }}>
        {done ? <IconCheck size={12} /> : n}
      </div>
      {!last &&
      <div style={{
        position: 'absolute', left: 13.5, top: 28, bottom: -14,
        width: 1, background: t.borderStrong, opacity: 0.6
      }} />
      }
      <div style={{ paddingTop: 2 }}>
        <div style={{
          fontFamily: t.bodyFont, fontSize: 13, fontWeight: 600,
          color: t.fg, lineHeight: 1.2
        }}>{title}</div>
        <div style={{
          fontFamily: t.bodyFont, fontSize: 11.5, color: t.fgMuted, marginTop: 2
        }}>{sub}</div>
      </div>
    </div>);

}

Object.assign(window, { ComplaintForm });
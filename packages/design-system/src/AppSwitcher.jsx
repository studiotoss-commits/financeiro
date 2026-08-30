import React, { useEffect, useRef, useState } from 'react';

export default function AppSwitcher({ currentApp, apps, theme = 'light' }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const current = apps.find((app) => app.id === currentApp) || apps[0];

  useEffect(() => {
    const closeFromOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const closeFromKeyboard = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', closeFromOutside);
    document.addEventListener('keydown', closeFromKeyboard);
    return () => {
      document.removeEventListener('mousedown', closeFromOutside);
      document.removeEventListener('keydown', closeFromKeyboard);
    };
  }, []);

  return (
    <div className="base-app-switcher" data-theme={theme} ref={rootRef}>
      <button className="base-app-switcher__trigger" type="button" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((value) => !value)}>
        <span className="base-app-switcher__mark" aria-hidden="true"><i /><i /><i /><i /></span>
        <span className="base-app-switcher__identity"><strong>BASE</strong><p>{current.name}</p></span>
        <span className="base-app-switcher__chevron" aria-hidden="true">⌄</span>
      </button>
      {open && <div className="base-app-switcher__menu" role="menu">
        <div className="base-app-switcher__menu-head"><strong>Aplicativos BASE</strong><span>Escolha onde deseja trabalhar</span></div>
        {apps.map((app) => <a className={`base-app-switcher__option${app.id === currentApp ? ' is-current' : ''}`} href={app.href} role="menuitem" key={app.id}>
          <span className="base-app-switcher__option-mark" style={{ background: app.color }} aria-hidden="true">{app.shortName}</span>
          <span><strong>{app.name}</strong><small>{app.description}</small></span>
          {app.id === currentApp && <span className="base-app-switcher__current">Atual</span>}
        </a>)}
      </div>}
    </div>
  );
}

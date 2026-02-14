// EXAMPLE PAGE — replace this with your own landing page.
// This is a demo included with FastForward to show the boilerplate tech stack.

import logoUrl from '../assets/logo.svg';
import viteUrl from '../assets/vite.svg';
import preactUrl from '../assets/preact.svg';
import hapiUrl from '../assets/hapi.svg';
import postgresUrl from '../assets/postgres.svg';

const techStack = [
  { icon: viteUrl, url: 'https://vite.dev', alt: 'Vite' },
  { icon: preactUrl, url: 'https://preactjs.com', alt: 'Preact' },
  { icon: hapiUrl, url: 'https://hapi.dev', alt: 'Hapi' },
  { icon: postgresUrl, url: 'https://www.postgresql.org', alt: 'Postgres' },
];

export function Home() {
  return (
    <div class="h-screen w-screen flex items-center justify-center bg-zinc-100">
      <div class="relative w-[44rem] h-[44rem]">
        {/* Center logo */}
        <div class="absolute inset-0 flex items-center justify-center">
          <img src={logoUrl} alt="FastForward" class="w-48 h-48 drop-shadow-lg" />
        </div>

        {/* Orbiting tech logos */}
        <div class="absolute inset-0 orbit-ring">
          {techStack.map(({ icon, url, alt }, i) => {
            const deg = (i * 360) / techStack.length;
            const rad = (deg * Math.PI) / 180;
            const x = 50 + Math.sin(rad) * 40;
            const y = 50 - Math.cos(rad) * 40;
            return (
              <a
                key={alt}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                class="absolute orbit-icon hover:scale-125 transition-transform"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  translate: '-50% -50%',
                }}
              >
                <img src={icon} alt={alt} class="w-32 h-32" />
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}

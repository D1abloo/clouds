import {
  animate,
  animateChild,
  keyframes,
  query,
  stagger,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations'

export const loginAnimations = [
  trigger('pageZone', [
    transition(':enter', [
      style({ opacity: 0 }),
      animate('400ms 80ms ease-out', style({ opacity: 1 })),
    ]),
  ]),

  trigger('cardZone', [
    transition(':enter', [
      style({
        opacity: 0,
        transform: 'translateY(28px) scale(0.96)',
        filter: 'blur(6px)',
      }),
      animate(
        '680ms 120ms cubic-bezier(0.22, 1, 0.36, 1)',
        style({
          opacity: 1,
          transform: 'translateY(0) scale(1)',
          filter: 'blur(0)',
        }),
      ),
    ]),
  ]),

  trigger('headZone', [
    transition(':enter', [
      style({ opacity: 0, transform: 'translateX(-12px)' }),
      animate(
        '520ms 280ms cubic-bezier(0.22, 1, 0.36, 1)',
        style({ opacity: 1, transform: 'translateX(0)' }),
      ),
    ]),
  ]),

  trigger('oauthStagger', [
    transition(':enter', [
      query(
        '@oauthBtn',
        [stagger(90, animateChild())],
        { optional: true },
      ),
    ]),
  ]),

  trigger('oauthBtn', [
    transition(':enter', [
      style({ opacity: 0, transform: 'translateY(10px)' }),
      animate(
        '420ms cubic-bezier(0.22, 1, 0.36, 1)',
        style({ opacity: 1, transform: 'translateY(0)' }),
      ),
    ]),
    state('idle', style({ transform: 'scale(1)' })),
    state('loading', style({ transform: 'scale(0.98)', opacity: 0.85 })),
    transition('idle <=> loading', animate('180ms ease-out')),
  ]),

  trigger('dividerZone', [
    transition(':enter', [
      style({ opacity: 0, transform: 'scaleX(0.6)' }),
      animate(
        '400ms 420ms ease-out',
        style({ opacity: 1, transform: 'scaleX(1)' }),
      ),
    ]),
  ]),

  trigger('formStagger', [
    transition(':enter', [
      query(
        '@formField',
        [stagger(70, animateChild())],
        { optional: true },
      ),
    ]),
  ]),

  trigger('formField', [
    transition(':enter', [
      style({ opacity: 0, transform: 'translateY(8px)' }),
      animate(
        '360ms cubic-bezier(0.22, 1, 0.36, 1)',
        style({ opacity: 1, transform: 'translateY(0)' }),
      ),
    ]),
  ]),

  trigger('submitZone', [
    transition(':enter', [
      style({ opacity: 0, transform: 'translateY(6px)' }),
      animate(
        '380ms 520ms cubic-bezier(0.22, 1, 0.36, 1)',
        style({ opacity: 1, transform: 'translateY(0)' }),
      ),
    ]),
  ]),

  trigger('errorZone', [
    transition(':enter', [
      style({ opacity: 0, transform: 'translateX(-6px)' }),
      animate(
        '320ms ease-out',
        style({ opacity: 1, transform: 'translateX(0)' }),
      ),
      animate(
        '420ms 80ms ease-in-out',
        keyframes([
          style({ transform: 'translateX(0)', offset: 0 }),
          style({ transform: 'translateX(-4px)', offset: 0.25 }),
          style({ transform: 'translateX(4px)', offset: 0.5 }),
          style({ transform: 'translateX(-2px)', offset: 0.75 }),
          style({ transform: 'translateX(0)', offset: 1 }),
        ]),
      ),
    ]),
    transition(':leave', [
      animate('180ms ease-in', style({ opacity: 0, height: 0, margin: 0 })),
    ]),
  ]),

  trigger('demoZone', [
    transition(':enter', [
      style({ opacity: 0, transform: 'translateY(8px)' }),
      animate(
        '400ms 600ms ease-out',
        style({ opacity: 1, transform: 'translateY(0)' }),
      ),
    ]),
  ]),

  trigger('hintZone', [
    transition(':enter', [
      style({ opacity: 0, transform: 'translateY(6px)' }),
      animate(
        '420ms 680ms ease-out',
        style({ opacity: 1, transform: 'translateY(0)' }),
      ),
    ]),
  ]),

  trigger('bgOrb', [
    transition(':enter', [
      style({ opacity: 0, transform: 'scale(0.8)' }),
      animate(
        '1200ms 200ms ease-out',
        style({ opacity: 1, transform: 'scale(1)' }),
      ),
    ]),
  ]),

  trigger('markSpin', [
    transition(':enter', [
      style({ opacity: 0, transform: 'rotate(-40deg) scale(0.5)' }),
      animate(
        '700ms 350ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        style({ opacity: 1, transform: 'rotate(0deg) scale(1)' }),
      ),
    ]),
  ]),
]

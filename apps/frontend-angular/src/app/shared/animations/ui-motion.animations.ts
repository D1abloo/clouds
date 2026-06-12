import { animate, group, query, stagger, state, style, transition, trigger } from '@angular/animations'

const easeOut = 'cubic-bezier(0.2, 0, 0, 1)'
const easeSpring = 'cubic-bezier(0.16, 1, 0.3, 1)'

export const motionTiming = {
  fast: `180ms ${easeOut}`,
  normal: `260ms ${easeOut}`,
  slow: `360ms ${easeSpring}`,
}

export const pageReveal = trigger('pageReveal', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(10px)' }),
    animate(motionTiming.slow, style({ opacity: 1, transform: 'translateY(0)' })),
  ]),
  transition('* => *', [
    style({ opacity: 0.92, transform: 'translateY(8px)' }),
    animate(motionTiming.normal, style({ opacity: 1, transform: 'translateY(0)' })),
  ]),
])

export const panelReveal = trigger('panelReveal', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(10px) scale(0.99)' }),
    animate(motionTiming.normal, style({ opacity: 1, transform: 'translateY(0) scale(1)' })),
  ]),
])

export const slideInRight = trigger('slideInRight', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateX(18px)' }),
    animate(motionTiming.normal, style({ opacity: 1, transform: 'translateX(0)' })),
  ]),
])

export const emptyStateReveal = trigger('emptyStateReveal', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(12px)' }),
    group([
      animate(motionTiming.normal, style({ opacity: 1 })),
      animate(motionTiming.slow, style({ transform: 'translateY(0)' })),
    ]),
  ]),
])

export const collapseExpand = trigger('collapseExpand', [
  transition(':enter', [
    style({ height: 0, opacity: 0, transform: 'translateY(-4px)', overflow: 'hidden' }),
    animate(motionTiming.normal, style({ height: '*', opacity: 1, transform: 'translateY(0)' })),
  ]),
  transition(':leave', [
    style({ height: '*', opacity: 1, transform: 'translateY(0)', overflow: 'hidden' }),
    animate(motionTiming.fast, style({ height: 0, opacity: 0, transform: 'translateY(-4px)' })),
  ]),
])

export const stepTransition = trigger('stepTransition', [
  transition('* => *', [
    style({ opacity: 0, transform: 'translateX(12px)' }),
    animate(motionTiming.slow, style({ opacity: 1, transform: 'translateX(0)' })),
  ]),
])

export const staggerCards = trigger('staggerCards', [
  transition(':enter, * => *', [
    query(
      ':enter, .motion-card',
      [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        stagger(36, animate(motionTiming.normal, style({ opacity: 1, transform: 'translateY(0)' }))),
      ],
      { optional: true },
    ),
  ]),
])

export const toastAnimation = trigger('toastAnimation', [
  state('void', style({ opacity: 0, transform: 'translateY(8px) scale(0.98)' })),
  transition(':enter', [
    animate(motionTiming.normal, style({ opacity: 1, transform: 'translateY(0) scale(1)' })),
  ]),
  transition(':leave', [
    animate(motionTiming.fast, style({ opacity: 0, transform: 'translateY(6px) scale(0.98)' })),
  ]),
])

export const logReveal = trigger('logReveal', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(8px)' }),
    animate(motionTiming.normal, style({ opacity: 1, transform: 'translateY(0)' })),
  ]),
])

import { animate, query, stagger, style, transition, trigger } from '@angular/animations'

export const publicAnimations = [
  trigger('fadeUp', [
    transition(':enter', [
      style({ opacity: 0, transform: 'translateY(20px)' }),
      animate('500ms 80ms cubic-bezier(0.22,1,0.36,1)', style({ opacity: 1, transform: 'translateY(0)' })),
    ]),
  ]),
  trigger('staggerChildren', [
    transition(':enter', [
      query('@fadeUp', [stagger(80, [])], { optional: true }),
    ]),
  ]),
]

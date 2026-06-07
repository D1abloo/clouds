import {
  animate,
  animateChild,
  query,
  stagger,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations'

export const infraWorkspaceAnimations = [
  trigger('pageZone', [
    transition(':enter', [
      style({ opacity: 0 }),
      animate('320ms ease-out', style({ opacity: 1 })),
    ]),
  ]),
  trigger('heroZone', [
    transition(':enter', [
      style({ opacity: 0, transform: 'translateY(-10px)' }),
      animate('420ms 60ms cubic-bezier(0.22, 1, 0.36, 1)', style({ opacity: 1, transform: 'translateY(0)' })),
    ]),
  ]),
  trigger('navZone', [
    transition(':enter', [
      style({ opacity: 0, transform: 'translateY(6px)' }),
      animate('380ms 120ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
    ]),
  ]),
  trigger('panelZone', [
    transition(':enter', [
      style({ opacity: 0, transform: 'translateY(12px)' }),
      animate('400ms 180ms cubic-bezier(0.22, 1, 0.36, 1)', style({ opacity: 1, transform: 'translateY(0)' })),
    ]),
  ]),
  trigger('tabSwap', [
    transition('* => *', [
      style({ opacity: 0, transform: 'translateX(10px)' }),
      animate('260ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateX(0)' })),
    ]),
  ]),
  trigger('resourceStagger', [
    transition('* => *', [
      query(
        '@resourceCard',
        [stagger(45, animateChild())],
        { optional: true },
      ),
    ]),
  ]),
  trigger('resourceCard', [
    transition(':enter', [
      style({ opacity: 0, transform: 'translateY(8px)' }),
      animate('300ms cubic-bezier(0.22, 1, 0.36, 1)', style({ opacity: 1, transform: 'translateY(0)' })),
    ]),
  ]),
  trigger('detailZone', [
    state('collapsed', style({ height: '0', opacity: 0, overflow: 'hidden', padding: '0', margin: '0' })),
    state('expanded', style({ height: '*', opacity: 1, overflow: 'hidden' })),
    transition('collapsed <=> expanded', animate('240ms cubic-bezier(0.4, 0, 0.2, 1)')),
  ]),
  trigger('loadingZone', [
    transition(':enter', [
      style({ opacity: 0, transform: 'scaleX(0.96)' }),
      animate('220ms ease-out', style({ opacity: 1, transform: 'scaleX(1)' })),
    ]),
    transition(':leave', [
      animate('180ms ease-in', style({ opacity: 0 })),
    ]),
  ]),
]

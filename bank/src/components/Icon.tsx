import { SymbolView, type AndroidSymbol } from 'expo-symbols';
import type { ColorValue } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

/** One icon set: SF Symbols on iOS, Material Symbols on Android and web. */
const icon = (ios: SFSymbol, md: AndroidSymbol) => ({ ios, android: md, web: md });

export const ICONS = {
  home: icon('house.fill', 'home'),
  pay: icon('paperplane.fill', 'send'),
  cards: icon('creditcard.fill', 'credit_card'),
  insights: icon('chart.pie.fill', 'pie_chart'),
  send: icon('paperplane.fill', 'send'),
  bills: icon('doc.text.fill', 'receipt_long'),
  add: icon('plus', 'add'),
  move: icon('arrow.left.arrow.right', 'swap_horiz'),
  receive: icon('arrow.down.to.line', 'download'),
  eye: icon('eye', 'visibility'),
  eyeOff: icon('eye.slash', 'visibility_off'),
  right: icon('chevron.right', 'chevron_right'),
  left: icon('chevron.left', 'chevron_left'),
  back: icon('chevron.backward', 'arrow_back'),
  down: icon('chevron.down', 'expand_more'),
  copy: icon('doc.on.doc', 'content_copy'),
  share: icon('square.and.arrow.up', 'share'),
  lock: icon('lock.fill', 'lock'),
  faceid: icon('faceid', 'face'),
  fingerprint: icon('touchid', 'fingerprint'),
  freeze: icon('snowflake', 'ac_unit'),
  settings: icon('gearshape.fill', 'settings'),
  person: icon('person.crop.circle', 'account_circle'),
  search: icon('magnifyingglass', 'search'),
  close: icon('xmark', 'close'),
  check: icon('checkmark', 'check'),
  checkCircle: icon('checkmark.circle.fill', 'check_circle'),
  clockCircle: icon('clock.fill', 'schedule'),
  xCircle: icon('xmark.circle.fill', 'cancel'),
  warning: icon('exclamationmark.triangle.fill', 'warning'),
  info: icon('info.circle', 'info'),
  backspace: icon('delete.left', 'backspace'),
  trash: icon('trash', 'delete'),
  edit: icon('pencil', 'edit'),
  calendar: icon('calendar', 'calendar_month'),
  globe: icon('globe', 'public'),
  contactless: icon('wave.3.right', 'contactless'),
  atm: icon('banknote', 'local_atm'),
  online: icon('cart', 'shopping_cart'),
  limit: icon('slider.horizontal.3', 'tune'),
  report: icon('exclamationmark.octagon', 'report'),
  replace: icon('arrow.triangle.2.circlepath', 'autorenew'),
  logout: icon('rectangle.portrait.and.arrow.right', 'logout'),
  reset: icon('arrow.counterclockwise', 'restart_alt'),
  tools: icon('hammer.fill', 'build'),
  bank: icon('building.columns.fill', 'account_balance'),
  wallet: icon('wallet.bifold.fill', 'account_balance_wallet'),
  up: icon('arrow.up.right', 'north_east'),
  downLeft: icon('arrow.down.left', 'south_west'),
  trendUp: icon('arrow.up.right', 'trending_up'),
  trendDown: icon('arrow.down.right', 'trending_down'),
  // spending categories
  bolt: icon('bolt.fill', 'bolt'),
  cart: icon('cart.fill', 'shopping_cart'),
  dining: icon('fork.knife', 'restaurant'),
  car: icon('car.fill', 'directions_car'),
  bag: icon('bag.fill', 'shopping_bag'),
  health: icon('cross.case.fill', 'medical_services'),
  tv: icon('play.tv.fill', 'live_tv'),
  plane: icon('airplane', 'flight'),
  people: icon('person.2.fill', 'group'),
  cash: icon('banknote.fill', 'payments'),
  percent: icon('percent', 'percent'),
  more: icon('ellipsis', 'more_horiz'),
  savings: icon('building.columns.fill', 'savings'),
  // biller groups
  water: icon('drop.fill', 'water_drop'),
  wifi: icon('wifi', 'wifi'),
  phone: icon('iphone', 'smartphone'),
  shield: icon('shield.fill', 'shield'),
  // goals
  house: icon('house.fill', 'cottage'),
  laptop: icon('laptopcomputer', 'laptop'),
  gift: icon('gift.fill', 'redeem'),
  school: icon('graduationcap.fill', 'school'),
  heart: icon('heart.fill', 'favorite'),
  umbrella: icon('umbrella.fill', 'umbrella'),
  paw: icon('pawprint.fill', 'pets'),
  star: icon('star.fill', 'star'),
} satisfies Record<string, { ios: SFSymbol; android: AndroidSymbol; web: AndroidSymbol }>;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 22, color }: { name: IconName; size?: number; color: ColorValue }) {
  return <SymbolView name={ICONS[name]} size={size} tintColor={color} />;
}

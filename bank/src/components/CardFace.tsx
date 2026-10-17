import { Text, View } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';

import { masked, spaced } from '@/lib/catalog';
import type { Card } from '@/lib/ledger';
import { usePalette } from '@/theme';
import { Guilloche, Wordmark } from './Brand';
import { Icon } from './Icon';

const CARD_RATIO = 1.586;

function Chip({ color }: { color: string }) {
  return (
    <Svg width={42} height={32} viewBox="0 0 42 32" accessibilityElementsHidden>
      <Rect x={0.5} y={0.5} width={41} height={31} rx={6} fill={color} />
      {[11, 21].map(y => <Line key={y} x1={0} x2={42} y1={y} y2={y} stroke="#13213C" strokeOpacity={0.25} strokeWidth={1} />)}
      <Line x1={15} x2={15} y1={0} y2={32} stroke="#13213C" strokeOpacity={0.25} strokeWidth={1} />
      <Line x1={27} x2={27} y1={0} y2={32} stroke="#13213C" strokeOpacity={0.25} strokeWidth={1} />
    </Svg>
  );
}

/**
 * The card as you'd hold it. The full number, expiry and CVV only show while `revealed` (after the PIN or
 * biometric check); otherwise just the last four digits.
 */
export function CardFace({ card, holderName, revealed, width }: { card: Card; holderName: string; revealed: boolean; width: number }) {
  const pal = usePalette();
  const physical = card.kind === 'physical';
  const bg = physical ? '#13213C' : '#262A33';
  const ink = '#FFFFFF';
  const soft = 'rgba(255,255,255,0.7)';
  const mono = { fontVariant: ['tabular-nums' as const], letterSpacing: 1.5, color: ink };
  return (
    <View style={{ width, height: width / CARD_RATIO, borderRadius: 18, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: bg, padding: 18, justifyContent: 'space-between' }}
      accessible accessibilityLabel={`${card.name} ending ${card.number.slice(-4)}${card.frozen ? ', frozen' : ''}`}>
      <Guilloche color={pal.gold} opacity={0.16} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Wordmark size={16} color={ink} />
        <Text style={{ color: soft, fontSize: 13, fontWeight: '600', letterSpacing: 0.5 }}>{physical ? 'DEBIT' : 'VIRTUAL'}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {physical ? <Chip color={pal.gold} /> : null}
        <Icon name="contactless" size={22} color={soft} />
      </View>
      <Text selectable={revealed} style={{ ...mono, fontSize: 19, fontWeight: '600' }} numberOfLines={1} adjustsFontSizeToFit>
        {revealed ? spaced(card.number) : `••••  ••••  ••••  ${card.number.slice(-4)}`}
      </Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
        <Text style={{ color: ink, fontSize: 14, fontWeight: '600', letterSpacing: 0.8, flex: 1 }} numberOfLines={1}>{holderName.toUpperCase()}</Text>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: soft, fontSize: 9, fontWeight: '600', letterSpacing: 0.8 }}>{revealed ? 'EXPIRES · CVV' : 'EXPIRES'}</Text>
          <Text selectable={revealed} style={{ ...mono, fontSize: 14, fontWeight: '600' }}>{revealed ? `${card.expiry}  ·  ${card.cvv}` : card.expiry}</Text>
        </View>
      </View>
      {card.frozen ? (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(196, 220, 245, 0.72)', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Icon name="freeze" size={34} color="#13213C" />
          <Text style={{ color: '#13213C', fontSize: 17, fontWeight: '700' }}>Frozen</Text>
          <Text style={{ color: '#13213C', fontSize: 13 }}>{masked(card.number)}</Text>
        </View>
      ) : null}
    </View>
  );
}

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";

import { Card, PageHeader, PrimaryButton } from "@/components/quote-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useQuoteStore } from "@/lib/quote-store";

function GuideRow({
  icon,
  title,
  description,
  tone = "blue",
}: {
  icon: "calculate" | "lock" | "computer" | "info";
  title: string;
  description: string;
  tone?: "blue" | "mint" | "navy" | "orange";
}) {
  const colors = useColors();
  const palette = {
    blue: { background: "#EAF0FF", foreground: "#2F6BFF" },
    mint: { background: "#E6F8F3", foreground: "#24B38E" },
    navy: { background: "#E9EDF2", foreground: "#10233D" },
    orange: { background: "#FFF4E4", foreground: "#D97706" },
  }[tone];

  return (
    <View style={styles.guideRow}>
      <View style={[styles.guideIcon, { backgroundColor: palette.background }]}>
        <MaterialIcons name={icon} size={21} color={palette.foreground} />
      </View>
      <View style={styles.guideText}>
        <Text style={[styles.guideTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.guideDescription, { color: colors.muted }]}>{description}</Text>
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const { records, clearRecords } = useQuoteStore();

  const confirmClear = () => {
    if (!records.length) {
      Alert.alert("저장된 이력이 없습니다", "새 견적을 만들면 이곳에 로컬로 보관됩니다.");
      return;
    }
    Alert.alert(
      "모든 상담 이력을 삭제할까요?",
      `${records.length}건의 상담 기록이 이 기기에서 영구 삭제됩니다.`,
      [
        { text: "취소", style: "cancel" },
        { text: "전체 삭제", style: "destructive", onPress: () => void clearRecords() },
      ],
    );
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PageHeader
          eyebrow="WORKSPACE SETTINGS"
          title="설정 및 운영 안내"
          description="견적 계산 기준과 데이터 보관 방식, 실제 Excel 연동 범위를 확인하세요."
        />

        <Text style={[styles.sectionTitle, { color: colors.text }]}>견적 계산 기준</Text>
        <Card style={styles.cardGap}>
          <GuideRow
            icon="calculate"
            title="로컬 시뮬레이션 엔진"
            description="상품 유형, 캐피탈사 계수, 할인, 수수료, 기간과 잔가 모드를 이용해 예상 금액을 계산합니다."
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <GuideRow
            icon="info"
            title="상담용 예상값"
            description="실제 승인 금리, 세금, 보험, 신용도와 출고 조건에 따라 최종 금액은 달라질 수 있습니다."
            tone="orange"
          />
        </Card>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>데이터와 Excel</Text>
        <Card style={styles.cardGap}>
          <GuideRow
            icon="lock"
            title="기기 로컬 보관"
            description={`현재 ${records.length}건의 상담이 이 기기에 저장되어 있습니다. 계정이나 클라우드 동기화는 사용하지 않습니다.`}
            tone="mint"
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <GuideRow
            icon="computer"
            title="PC Excel 브리지 확장"
            description="Microsoft Excel 원본 수식을 직접 실행하려면 Windows PC에 별도 브리지 서비스를 설치해 앱의 입력 데이터를 전달해야 합니다."
            tone="navy"
          />
        </Card>

        <Card style={styles.dangerCard}>
          <View style={styles.dangerHeading}>
            <View>
              <Text style={[styles.dangerTitle, { color: colors.text }]}>로컬 상담 이력 초기화</Text>
              <Text style={[styles.dangerBody, { color: colors.muted }]}>삭제한 기록은 복구할 수 없습니다.</Text>
            </View>
            <Text style={[styles.count, { color: colors.error }]}>{records.length}건</Text>
          </View>
          <PrimaryButton label="모든 이력 삭제" icon="delete-outline" tone="light" onPress={confirmClear} />
        </Card>

        <View style={styles.appInfo}>
          <View style={styles.appMark}><Text style={styles.appMarkText}>U</Text></View>
          <Text style={[styles.appName, { color: colors.text }]}>유니디아 견적 플로우</Text>
          <Text style={[styles.version, { color: colors.muted }]}>Version 1.0.0 · Local-first mobile workspace</Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingBottom: 38, gap: 12 },
  sectionTitle: { fontSize: 15, lineHeight: 21, fontWeight: "900", marginTop: 3 },
  cardGap: { gap: 15 },
  guideRow: { flexDirection: "row", gap: 12 },
  guideIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  guideText: { flex: 1, gap: 4 },
  guideTitle: { fontSize: 14, lineHeight: 20, fontWeight: "900" },
  guideDescription: { fontSize: 12.5, lineHeight: 19 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 52 },
  dangerCard: { gap: 16, marginTop: 4 },
  dangerHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dangerTitle: { fontSize: 15, lineHeight: 21, fontWeight: "900" },
  dangerBody: { fontSize: 12, lineHeight: 18, marginTop: 3 },
  count: { fontSize: 13, fontWeight: "900" },
  appInfo: { alignItems: "center", paddingVertical: 20, gap: 7 },
  appMark: { width: 42, height: 42, borderRadius: 13, backgroundColor: "#10233D", alignItems: "center", justifyContent: "center" },
  appMarkText: { color: "#FFFFFF", fontSize: 21, fontWeight: "900" },
  appName: { fontSize: 14, lineHeight: 20, fontWeight: "900" },
  version: { fontSize: 11.5, lineHeight: 17 },
});

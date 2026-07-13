import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { Card, PageHeader, PrimaryButton, StatusPill } from "@/components/quote-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { formatKrw } from "@/lib/quote-engine";
import { useQuoteStore } from "@/lib/quote-store";
import type { QuoteRecord } from "@shared/quote";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "short" }).format(
    new Date(value),
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const { records } = useQuoteStore();
  const recent = records.slice(0, 3);
  const consulting = records.filter((item) => item.status === "consulting").length;
  const completed = records.filter((item) => item.status === "completed").length;

  const openRecord = (record: QuoteRecord) => {
    router.push({ pathname: "/(tabs)/new-quote", params: { recordId: record.id } });
  };

  return (
    <ScreenContainer>
      <FlatList
        data={recent}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <View style={styles.brandRow}>
              <View style={styles.brandMark}>
                <Text style={styles.brandMarkText}>U</Text>
              </View>
              <Text style={[styles.brandName, { color: colors.text }]}>UNIDIA</Text>
              <Text style={[styles.date, { color: colors.muted }]}>{formatDate(new Date().toISOString())}</Text>
            </View>

            <PageHeader
              eyebrow="QUOTE WORKSPACE"
              title="견적 업무를 빠르게 시작하세요"
              description="문의 캡처 한 장에서 고객 전달용 견적까지 이어집니다."
            />

            <View style={styles.statsRow}>
              <Card style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: "#FFF4E4" }]}>
                  <MaterialIcons name="pending-actions" size={22} color={colors.warning} />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>{consulting}</Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>상담중</Text>
              </Card>
              <Card style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: "#E6F8F3" }]}>
                  <MaterialIcons name="task-alt" size={22} color={colors.success} />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>{completed}</Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>완료</Text>
              </Card>
            </View>

            <Card style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <MaterialIcons name="document-scanner" size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.heroEyebrow}>AI CAPTURE TO QUOTE</Text>
              <Text style={styles.heroTitle}>새 고객 견적 만들기</Text>
              <Text style={styles.heroDescription}>
                문의 이미지를 불러오면 차량과 계약 정보를 자동으로 정리합니다.
              </Text>
              <PrimaryButton
                label="새 견적 시작"
                icon="arrow-forward"
                tone="light"
                onPress={() => router.push("/(tabs)/new-quote")}
              />
            </Card>

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>최근 상담</Text>
              <Pressable onPress={() => router.push("/(tabs)/history") }>
                <Text style={[styles.more, { color: colors.tint }]}>전체 보기</Text>
              </Pressable>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => openRecord(item)} style={({ pressed }) => pressed && styles.rowPressed}>
            <Card style={styles.recordCard}>
              <View style={styles.recordTop}>
                <View style={styles.recordIcon}>
                  <MaterialIcons name="directions-car" size={22} color={colors.tint} />
                </View>
                <View style={styles.recordInfo}>
                  <Text numberOfLines={1} style={[styles.recordTitle, { color: colors.text }]}>
                    {[item.vehicle.brand, item.vehicle.model, item.vehicle.trim].filter(Boolean).join(" ") || "차량 정보 확인중"}
                  </Text>
                  <Text style={[styles.recordMeta, { color: colors.muted }]}>
                    {formatDate(item.updatedAt)} · {item.vehicle.contractMonths}개월
                  </Text>
                </View>
                <StatusPill label={item.status === "completed" ? "완료" : "상담중"} completed={item.status === "completed"} />
              </View>
              {item.result ? (
                <Text style={[styles.recordAmount, { color: colors.text }]}>월 {formatKrw(item.result.monthlyPayment)}</Text>
              ) : null}
            </Card>
          </Pressable>
        )}
        ListEmptyComponent={
          <Card style={styles.emptyCard}>
            <MaterialIcons name="inbox" size={28} color={colors.muted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>아직 상담 기록이 없습니다</Text>
            <Text style={[styles.emptyBody, { color: colors.muted }]}>첫 문의 캡처로 견적을 만들어 보세요.</Text>
          </Card>
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingBottom: 32, gap: 10 },
  brandRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 10, gap: 9 },
  brandMark: { width: 30, height: 30, borderRadius: 9, backgroundColor: "#10233D", alignItems: "center", justifyContent: "center" },
  brandMarkText: { color: "#FFFFFF", fontSize: 16, fontWeight: "900" },
  brandName: { fontSize: 14, fontWeight: "900", letterSpacing: 1.6 },
  date: { marginLeft: "auto", fontSize: 12, fontWeight: "600" },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  statCard: { flex: 1, padding: 15 },
  statIcon: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  statValue: { fontSize: 28, lineHeight: 32, fontWeight: "900" },
  statLabel: { fontSize: 13, lineHeight: 18, fontWeight: "700" },
  heroCard: { backgroundColor: "#10233D", borderColor: "#10233D", gap: 12, padding: 20, marginBottom: 24 },
  heroIcon: { width: 48, height: 48, borderRadius: 15, backgroundColor: "#2F6BFF", alignItems: "center", justifyContent: "center" },
  heroEyebrow: { color: "#8FAEFF", fontSize: 11, lineHeight: 16, fontWeight: "900", letterSpacing: 1 },
  heroTitle: { color: "#FFFFFF", fontSize: 23, lineHeight: 29, fontWeight: "900" },
  heroDescription: { color: "#C9D3E2", fontSize: 14, lineHeight: 21, marginBottom: 4 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  sectionTitle: { fontSize: 19, lineHeight: 25, fontWeight: "900" },
  more: { fontSize: 13, fontWeight: "800" },
  recordCard: { padding: 14, marginBottom: 10 },
  recordTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  recordIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#EAF0FF", alignItems: "center", justifyContent: "center" },
  recordInfo: { flex: 1, gap: 3 },
  recordTitle: { fontSize: 15, lineHeight: 20, fontWeight: "800" },
  recordMeta: { fontSize: 12, lineHeight: 17 },
  recordAmount: { marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#DDE3EC", textAlign: "right", fontSize: 16, fontWeight: "900" },
  rowPressed: { opacity: 0.7 },
  emptyCard: { alignItems: "center", gap: 7, paddingVertical: 28 },
  emptyTitle: { fontSize: 15, lineHeight: 21, fontWeight: "800" },
  emptyBody: { fontSize: 13, lineHeight: 19 },
});

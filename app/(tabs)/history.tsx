import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Card, PageHeader, SelectChip, StatusPill } from "@/components/quote-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { formatKrw } from "@/lib/quote-engine";
import { useQuoteStore } from "@/lib/quote-store";
import { CAPITAL_LABELS, PRODUCT_LABELS, type QuoteRecord, type QuoteStatus } from "@shared/quote";

type Filter = "all" | QuoteStatus;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function HistoryScreen() {
  const colors = useColors();
  const router = useRouter();
  const { records } = useQuoteStore();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return records.filter((record) => {
      if (filter !== "all" && record.status !== filter) return false;
      if (!keyword) return true;
      return [
        record.vehicle.brand,
        record.vehicle.model,
        record.vehicle.trim,
        record.vehicle.customerMemo,
        CAPITAL_LABELS[record.conditions.capitalCompany],
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });
  }, [filter, query, records]);

  const openRecord = (record: QuoteRecord) => {
    router.push({ pathname: "/(tabs)/new-quote", params: { recordId: record.id } });
  };

  return (
    <ScreenContainer>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <PageHeader
              eyebrow="LOCAL ARCHIVE"
              title="상담 이력"
              description="기기에 저장된 상담을 찾아 이어서 편집하거나 완료 견적을 다시 확인하세요."
            />
            <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <MaterialIcons name="search" size={21} color={colors.muted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="차량명, 고객 메모, 캐피탈사 검색"
                placeholderTextColor={colors.muted}
                returnKeyType="search"
                style={[styles.searchInput, { color: colors.text }]}
              />
            </View>
            <View style={styles.filters}>
              <SelectChip label={`전체 ${records.length}`} selected={filter === "all"} onPress={() => setFilter("all")} />
              <SelectChip label="상담중" selected={filter === "consulting"} onPress={() => setFilter("consulting")} />
              <SelectChip label="완료" selected={filter === "completed"} onPress={() => setFilter("completed")} />
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => openRecord(item)} style={({ pressed }) => pressed && styles.pressed}>
            <Card style={styles.recordCard}>
              <View style={styles.topRow}>
                <View style={[styles.vehicleIcon, { backgroundColor: "#EAF0FF" }]}>
                  <MaterialIcons name="directions-car" size={22} color={colors.tint} />
                </View>
                <View style={styles.heading}>
                  <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>
                    {[item.vehicle.brand, item.vehicle.model, item.vehicle.trim].filter(Boolean).join(" ") || "차량 정보 확인중"}
                  </Text>
                  <Text style={[styles.meta, { color: colors.muted }]}>{formatDate(item.updatedAt)}</Text>
                </View>
                <StatusPill label={item.status === "completed" ? "완료" : "상담중"} completed={item.status === "completed"} />
              </View>
              <View style={[styles.details, { borderTopColor: colors.border }]}>
                <View style={styles.detailText}>
                  <Text style={[styles.product, { color: colors.text }]}>
                    {PRODUCT_LABELS[item.conditions.productType]} · {CAPITAL_LABELS[item.conditions.capitalCompany]}
                  </Text>
                  <Text style={[styles.meta, { color: colors.muted }]}>
                    {item.vehicle.contractMonths}개월 · 연 {item.vehicle.annualMileage.toLocaleString("ko-KR")}km
                  </Text>
                </View>
                <View style={styles.amountWrap}>
                  <Text style={[styles.amountLabel, { color: colors.muted }]}>예상 월 납입</Text>
                  <Text style={[styles.amount, { color: colors.text }]}>
                    {item.result ? formatKrw(item.result.monthlyPayment) : "산출 전"}
                  </Text>
                </View>
              </View>
            </Card>
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <Card style={styles.emptyCard}>
            <MaterialIcons name="manage-search" size={34} color={colors.muted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>조건에 맞는 상담이 없습니다</Text>
            <Text style={[styles.emptyBody, { color: colors.muted }]}>검색어나 필터를 바꾸어 확인해 주세요.</Text>
          </Card>
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingBottom: 32 },
  headerBlock: { gap: 12, marginBottom: 18 },
  search: { minHeight: 48, borderRadius: 14, borderWidth: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 9 },
  searchInput: { flex: 1, fontSize: 15, lineHeight: 21, paddingVertical: 11 },
  filters: { flexDirection: "row", gap: 8 },
  recordCard: { padding: 14 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  vehicleIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  heading: { flex: 1, gap: 3 },
  title: { fontSize: 15, lineHeight: 21, fontWeight: "900" },
  meta: { fontSize: 11.5, lineHeight: 17, fontWeight: "600" },
  details: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 12, paddingTop: 12, flexDirection: "row", alignItems: "flex-end", gap: 8 },
  detailText: { flex: 1, gap: 3 },
  product: { fontSize: 13, lineHeight: 19, fontWeight: "800" },
  amountWrap: { alignItems: "flex-end", gap: 3 },
  amountLabel: { fontSize: 10.5, lineHeight: 15, fontWeight: "700" },
  amount: { fontSize: 15, lineHeight: 21, fontWeight: "900" },
  separator: { height: 10 },
  pressed: { opacity: 0.7 },
  emptyCard: { alignItems: "center", paddingVertical: 30, gap: 7 },
  emptyTitle: { fontSize: 15, lineHeight: 21, fontWeight: "800" },
  emptyBody: { fontSize: 13, lineHeight: 19 },
});

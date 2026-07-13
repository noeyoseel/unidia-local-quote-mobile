import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";

import { Card, FormField, PageHeader, PrimaryButton } from "@/components/quote-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { CAPITAL_LABELS, type CapitalCompany } from "@shared/quote";

type RateDraft = { annualRatePercent: string; residualAdjustmentPercent: string };

function toPercentString(fraction: number) {
  return String(Math.round(fraction * 1000) / 10);
}

export default function RatesScreen() {
  const colors = useColors();
  const me = trpc.auth.me.useQuery();
  const utils = trpc.useUtils();
  const ratesQuery = trpc.rates.list.useQuery(undefined, { enabled: !!me.data });
  const updateMutation = trpc.rates.update.useMutation({
    onSuccess: () => utils.rates.list.invalidate(),
  });
  const [drafts, setDrafts] = useState<Record<CapitalCompany, RateDraft>>({} as Record<CapitalCompany, RateDraft>);

  useEffect(() => {
    if (!ratesQuery.data) return;
    setDrafts((prev) => {
      const next = { ...prev };
      for (const row of ratesQuery.data) {
        if (next[row.company]) continue;
        next[row.company] = {
          annualRatePercent: toPercentString(row.annualRate),
          residualAdjustmentPercent: toPercentString(row.residualAdjustment),
        };
      }
      return next;
    });
  }, [ratesQuery.data]);

  const saveCompany = async (company: CapitalCompany) => {
    const draft = drafts[company];
    if (!draft) return;
    const annualRate = (Number(draft.annualRatePercent.replace(/[^0-9.-]/g, "")) || 0) / 100;
    const residualAdjustment =
      (Number(draft.residualAdjustmentPercent.replace(/[^0-9.-]/g, "")) || 0) / 100;
    await updateMutation.mutateAsync({ company, annualRate, residualAdjustment });
  };

  if (me.isLoading) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.tint} />
        </View>
      </ScreenContainer>
    );
  }

  if (!me.data) {
    return <Redirect href="/login" />;
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PageHeader
          eyebrow="RATE MANAGEMENT"
          title="캐피탈사 금리 관리"
          description="매달 캐피탈사에서 받은 최신 금리를 여기서 바로 반영하세요. 코드 수정이나 재배포가 필요 없습니다."
        />

        {ratesQuery.isLoading ? <ActivityIndicator color={colors.tint} /> : null}

        {ratesQuery.data?.map((row) => {
          const draft = drafts[row.company] ?? { annualRatePercent: "0", residualAdjustmentPercent: "0" };
          return (
            <Card key={row.company} style={styles.card}>
              <View style={styles.cardHeader}>
                <MaterialIcons name="percent" size={20} color={colors.tint} />
                <Text style={[styles.cardTitle, { color: colors.text }]}>{CAPITAL_LABELS[row.company]}</Text>
              </View>
              <FormField
                label="연 이자율"
                value={draft.annualRatePercent}
                onChangeText={(value) =>
                  setDrafts((prev) => ({ ...prev, [row.company]: { ...draft, annualRatePercent: value } }))
                }
                keyboardType="decimal-pad"
                suffix="%"
              />
              <FormField
                label="잔가 조정"
                value={draft.residualAdjustmentPercent}
                onChangeText={(value) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [row.company]: { ...draft, residualAdjustmentPercent: value },
                  }))
                }
                keyboardType="decimal-pad"
                suffix="%p"
              />
              <PrimaryButton
                label={updateMutation.isPending ? "저장 중…" : "저장"}
                icon="save"
                tone="light"
                onPress={() => void saveCompany(row.company)}
                disabled={updateMutation.isPending}
              />
            </Card>
          );
        })}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingBottom: 38, gap: 14 },
  card: { gap: 12 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { fontSize: 16, lineHeight: 22, fontWeight: "900" },
});

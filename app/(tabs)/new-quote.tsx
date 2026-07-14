import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { captureRef } from "react-native-view-shot";

import { Card, FormField, PageHeader, PrimaryButton, SelectChip } from "@/components/quote-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { formatKrw, validateQuoteConditions, validateQuoteInput } from "@/lib/quote-engine";
import { useQuoteStore } from "@/lib/quote-store";
import { trpc } from "@/lib/trpc";
import {
  CAPITAL_LABELS,
  DEFAULT_CONDITIONS,
  EMPTY_VEHICLE,
  PRODUCT_LABELS,
  RESIDUAL_LABELS,
  type CapitalCompany,
  type CompareResult,
  type ProductType,
  type QuoteConditions,
  type QuoteRecord,
  type QuoteResult,
  type ResidualMode,
  type VehicleInfo,
} from "@shared/quote";

const STEPS = ["문의 캡처", "정보 확인", "조건 설정", "비교·선택", "견적 결과"];

function StepProgress({ step }: { step: number }) {
  const colors = useColors();
  const total = STEPS.length;
  return (
    <View style={styles.progressWrap}>
      <View style={styles.progressTop}>
        <Text style={[styles.progressLabel, { color: colors.tint }]}>{step + 1}/{total} {STEPS[step]}</Text>
        <Text style={[styles.progressPercent, { color: colors.muted }]}>{Math.round(((step + 1) / total) * 100)}%</Text>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
        <View style={[styles.progressFill, { width: `${((step + 1) / total) * 100}%`, backgroundColor: colors.tint }]} />
      </View>
    </View>
  );
}

function moneyInput(value: string) {
  return Number(value.replace(/[^0-9]/g, "")) || 0;
}

export default function NewQuoteScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ recordId?: string }>();
  const { records, saveRecord } = useQuoteStore();
  const [quoteId, setQuoteId] = useState(() => `quote-${Date.now()}`);
  const [step, setStep] = useState(0);
  const [imageUri, setImageUri] = useState<string>();
  const [imageDataUrl, setImageDataUrl] = useState<string>();
  const [vehicle, setVehicle] = useState<VehicleInfo>(EMPTY_VEHICLE);
  const [conditions, setConditions] = useState<QuoteConditions>(DEFAULT_CONDITIONS);
  const [compareResults, setCompareResults] = useState<CompareResult[]>();
  const [selectedCompany, setSelectedCompany] = useState<CapitalCompany>();
  const [result, setResult] = useState<QuoteResult>();
  const [notice, setNotice] = useState<string>();
  const loadedId = useRef<string | undefined>(undefined);
  const quoteCardRef = useRef<View>(null);
  const extractMutation = trpc.quote.extractInquiry.useMutation();
  const compareMutation = trpc.quote.compare.useMutation();

  useEffect(() => {
    if (!params.recordId || loadedId.current === params.recordId) return;
    const record = records.find((item) => item.id === params.recordId);
    if (!record) return;
    loadedId.current = record.id;
    setQuoteId(record.id);
    setImageUri(record.imageUri);
    setVehicle(record.vehicle);
    setConditions(record.conditions);
    setCompareResults(record.compareResults);
    setSelectedCompany(record.selectedCompany);
    setResult(record.result);
    setStep(record.result ? 4 : record.compareResults ? 3 : 1);
  }, [params.recordId, records]);

  const vehicleName = useMemo(
    () => [vehicle.brand, vehicle.model, vehicle.trim].filter(Boolean).join(" ") || "차량 정보 미입력",
    [vehicle.brand, vehicle.model, vehicle.trim],
  );

  const buildRecord = (
    status: QuoteRecord["status"],
    nextVehicle = vehicle,
    nextConditions = conditions,
    nextCompareResults = compareResults,
    nextSelectedCompany = selectedCompany,
    nextResult = result,
  ): QuoteRecord => {
    const existing = records.find((item) => item.id === quoteId);
    const now = new Date().toISOString();
    return {
      id: quoteId,
      status,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      imageUri,
      vehicle: nextVehicle,
      conditions: nextConditions,
      compareResults: nextCompareResults,
      selectedCompany: nextSelectedCompany,
      result: nextResult,
    };
  };

  const resetFlow = () => {
    loadedId.current = undefined;
    setQuoteId(`quote-${Date.now()}`);
    setStep(0);
    setImageUri(undefined);
    setImageDataUrl(undefined);
    setVehicle(EMPTY_VEHICLE);
    setConditions(DEFAULT_CONDITIONS);
    setCompareResults(undefined);
    setSelectedCompany(undefined);
    setResult(undefined);
    setNotice(undefined);
  };

  const toggleCompany = (company: CapitalCompany) => {
    setConditions((prev) => {
      const has = prev.capitalCompanies.includes(company);
      if (has && prev.capitalCompanies.length === 1) return prev; // keep at least one selected
      const capitalCompanies = has
        ? prev.capitalCompanies.filter((c) => c !== company)
        : [...prev.capitalCompanies, company];
      return { ...prev, capitalCompanies };
    });
  };

  const pickImage = async () => {
    setNotice(undefined);
    const selected = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.75,
      base64: true,
    });
    if (selected.canceled) return;
    const asset = selected.assets[0];
    setImageUri(asset.uri);
    setImageDataUrl(
      asset.base64 ? `data:${asset.mimeType ?? "image/jpeg"};base64,${asset.base64}` : undefined,
    );
  };

  const extractImage = async () => {
    if (!imageDataUrl) {
      setNotice("이미지를 다시 선택하거나 수기 입력으로 진행해 주세요.");
      return;
    }
    setNotice(undefined);
    try {
      const extracted = await extractMutation.mutateAsync({ imageDataUrl });
      // AI extraction never reads the customer's phone number off the capture
      // image — that's entered by hand, so carry over whatever's already set.
      const nextVehicle: VehicleInfo = { ...extracted, customerPhone: vehicle.customerPhone };
      setVehicle(nextVehicle);
      await saveRecord(buildRecord("consulting", nextVehicle));
      setStep(1);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "AI 추출에 실패했습니다. 수기 입력으로 진행할 수 있습니다.");
    }
  };

  const continueManually = async () => {
    await saveRecord(buildRecord("consulting"));
    setStep(1);
  };

  const confirmVehicle = async () => {
    const errors = validateQuoteInput(vehicle);
    if (errors.length) {
      Alert.alert("입력 내용을 확인해 주세요", errors[0]);
      return;
    }
    await saveRecord(buildRecord("consulting"));
    setStep(2);
  };

  const runComparison = async () => {
    const conditionErrors = validateQuoteConditions(vehicle, conditions);
    if (conditionErrors.length) {
      Alert.alert("조건을 확인해 주세요", conditionErrors[0]);
      return;
    }
    try {
      const nextCompareResults = await compareMutation.mutateAsync({ vehicle, conditions });
      setCompareResults(nextCompareResults);
      setSelectedCompany(undefined);
      setResult(undefined);
      await saveRecord(buildRecord("consulting", vehicle, conditions, nextCompareResults, undefined, undefined));
      setStep(3);
    } catch (error) {
      Alert.alert("견적 산출 실패", error instanceof Error ? error.message : "입력값을 확인해 주세요.");
    }
  };

  const selectCompany = async (entry: CompareResult) => {
    setSelectedCompany(entry.company);
    setResult(entry.result);
    await saveRecord(buildRecord("consulting", vehicle, conditions, compareResults, entry.company, entry.result));
    setStep(4);
  };

  const copyMessage = async () => {
    if (!result) return;
    await Clipboard.setStringAsync(result.message);
    setNotice("발송 문구를 클립보드에 복사했습니다.");
  };

  const shareQuote = async () => {
    if (!result) return;
    try {
      if (Platform.OS === "web" || !quoteCardRef.current) {
        await Share.share({ message: result.message, title: `${vehicleName} 견적` });
        return;
      }
      const uri = await captureRef(quoteCardRef, { format: "png", quality: 1, result: "tmpfile" });
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        await Share.share({ message: result.message });
        return;
      }
      await Sharing.shareAsync(uri, {
        dialogTitle: `${vehicleName} 견적 공유`,
        mimeType: "image/png",
        UTI: "public.png",
      });
    } catch {
      Alert.alert("공유할 수 없습니다", "기기 공유 설정을 확인하거나 문구 복사를 이용해 주세요.");
    }
  };

  const completeQuote = async () => {
    if (!result) return;
    await saveRecord(buildRecord("completed"));
    setNotice("견적을 완료 이력으로 저장했습니다.");
    Alert.alert("견적 저장 완료", "상담 이력에서 다시 확인할 수 있습니다.", [
      { text: "새 견적", onPress: resetFlow },
      { text: "이력 보기", onPress: () => router.push("/(tabs)/history") },
    ]);
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={8}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <StepProgress step={step} />

          {step === 0 ? (
            <View style={styles.sectionGap}>
              <PageHeader
                eyebrow="STEP 01"
                title="문의 캡처를 불러오세요"
                description="카랩 등에서 받은 고객 문의 화면을 선택하면 핵심 정보를 자동 추출합니다."
              />
              <Card style={styles.uploadCard}>
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.uploadIcon, { backgroundColor: "#EAF0FF" }]}>
                    <MaterialIcons name="add-photo-alternate" size={38} color={colors.tint} />
                  </View>
                )}
                <Text style={[styles.uploadTitle, { color: colors.text }]}>
                  {imageUri ? "캡처가 준비되었습니다" : "고객 문의 이미지 선택"}
                </Text>
                <Text style={[styles.uploadBody, { color: colors.muted }]}>
                  JPG, PNG 캡처를 선택할 수 있습니다. AI 결과는 다음 단계에서 직접 검수합니다.
                </Text>
                <PrimaryButton
                  label={imageUri ? "다른 이미지 선택" : "사진 보관함 열기"}
                  icon="photo-library"
                  tone="light"
                  onPress={pickImage}
                />
              </Card>
              {notice ? <Text style={[styles.notice, { color: colors.error }]}>{notice}</Text> : null}
              <PrimaryButton
                label={extractMutation.isPending ? "AI가 정보를 읽는 중…" : "AI 정보 추출"}
                icon="auto-awesome"
                onPress={extractImage}
                disabled={!imageUri || extractMutation.isPending}
              />
              <PrimaryButton label="수기 입력으로 진행" tone="light" onPress={continueManually} />
              {extractMutation.isPending ? <ActivityIndicator color={colors.tint} /> : null}
            </View>
          ) : null}

          {step === 1 ? (
            <View style={styles.sectionGap}>
              <PageHeader
                eyebrow="STEP 02"
                title="추출 정보를 확인하세요"
                description="자동 입력된 값은 확정 전 자유롭게 수정할 수 있습니다."
              />
              <Card style={styles.formCard}>
                {vehicle.confidence > 0 ? (
                  <View style={styles.confidenceRow}>
                    <MaterialIcons name="verified" size={18} color={vehicle.confidence >= 0.75 ? colors.success : colors.warning} />
                    <Text style={[styles.confidenceText, { color: colors.muted }]}>AI 추출 신뢰도 {Math.round(vehicle.confidence * 100)}%</Text>
                  </View>
                ) : null}
                <FormField label="브랜드" value={vehicle.brand} onChangeText={(brand) => setVehicle({ ...vehicle, brand })} placeholder="예: 현대" />
                <FormField label="모델명" value={vehicle.model} onChangeText={(model) => setVehicle({ ...vehicle, model })} placeholder="예: 그랜저" />
                <FormField label="세부 트림" value={vehicle.trim} onChangeText={(trim) => setVehicle({ ...vehicle, trim })} placeholder="예: 캘리그래피" />
                <FormField label="총 차량 금액" value={vehicle.vehiclePrice ? vehicle.vehiclePrice.toLocaleString("ko-KR") : ""} onChangeText={(value) => setVehicle({ ...vehicle, vehiclePrice: moneyInput(value) })} keyboardType="number-pad" suffix="원" />
                <View style={styles.twoColumns}>
                  <View style={styles.column}><FormField label="계약 기간" value={String(vehicle.contractMonths || "")} onChangeText={(value) => setVehicle({ ...vehicle, contractMonths: moneyInput(value) })} keyboardType="number-pad" suffix="개월" /></View>
                  <View style={styles.column}><FormField label="연간 주행거리" value={vehicle.annualMileage ? vehicle.annualMileage.toLocaleString("ko-KR") : ""} onChangeText={(value) => setVehicle({ ...vehicle, annualMileage: moneyInput(value) })} keyboardType="number-pad" suffix="km" /></View>
                </View>
                <FormField label="고객 메모" value={vehicle.customerMemo} onChangeText={(customerMemo) => setVehicle({ ...vehicle, customerMemo })} placeholder="상담 메모" />
                <FormField
                  label="고객 연락처 (선택 · 개인정보)"
                  value={vehicle.customerPhone}
                  onChangeText={(customerPhone) => setVehicle({ ...vehicle, customerPhone })}
                  placeholder="010-0000-0000"
                  keyboardType="phone-pad"
                />
              </Card>
              <View style={styles.actionRow}>
                <View style={styles.actionFlex}><PrimaryButton label="이전" tone="light" onPress={() => setStep(0)} /></View>
                <View style={styles.actionWide}><PrimaryButton label="조건 설정" icon="arrow-forward" onPress={confirmVehicle} /></View>
              </View>
            </View>
          ) : null}

          {step === 2 ? (
            <View style={styles.sectionGap}>
              <PageHeader
                eyebrow="STEP 03 · HUMAN TOUCH"
                title="영업 조건을 조정하세요"
                description="시장 상황과 대리점 마진을 반영해 최종 산출 조건을 설정합니다."
              />
              <Card style={styles.formCard}>
                <Text style={[styles.groupTitle, { color: colors.text }]}>금융상품</Text>
                <View style={styles.chipWrap}>
                  {(Object.keys(PRODUCT_LABELS) as ProductType[]).map((key) => (
                    <SelectChip key={key} label={PRODUCT_LABELS[key]} selected={conditions.productType === key} onPress={() => setConditions({ ...conditions, productType: key })} />
                  ))}
                </View>
                <Text style={[styles.groupTitle, { color: colors.text }]}>캐피탈사 (복수 선택 가능)</Text>
                <View style={styles.chipWrap}>
                  {(Object.keys(CAPITAL_LABELS) as CapitalCompany[]).map((key) => (
                    <SelectChip key={key} label={CAPITAL_LABELS[key]} selected={conditions.capitalCompanies.includes(key)} onPress={() => toggleCompany(key)} />
                  ))}
                </View>
                <View style={styles.divider} />
                <FormField label="할인 금액" value={conditions.discountAmount ? conditions.discountAmount.toLocaleString("ko-KR") : ""} onChangeText={(value) => setConditions({ ...conditions, discountAmount: moneyInput(value) })} keyboardType="number-pad" suffix="원" />
                <FormField label="추가 수수료·인센티브율" value={String(conditions.additionalFeeRate || "")} onChangeText={(value) => setConditions({ ...conditions, additionalFeeRate: Number(value.replace(/[^0-9.]/g, "")) || 0 })} keyboardType="decimal-pad" suffix="%" />
                <Text style={[styles.groupTitle, { color: colors.text }]}>잔가 모드</Text>
                <View style={styles.chipWrap}>
                  {(Object.keys(RESIDUAL_LABELS) as ResidualMode[]).map((key) => (
                    <SelectChip key={key} label={RESIDUAL_LABELS[key]} selected={conditions.residualMode === key} onPress={() => setConditions({ ...conditions, residualMode: key })} />
                  ))}
                </View>
              </Card>
              <Card style={styles.summaryCard}>
                <View>
                  <Text style={[styles.summaryLabel, { color: colors.muted }]}>실질 차량가</Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>{formatKrw(Math.max(vehicle.vehiclePrice - conditions.discountAmount, 0))}</Text>
                </View>
                <MaterialIcons name="calculate" size={28} color={colors.tint} />
              </Card>
              <View style={styles.actionRow}>
                <View style={styles.actionFlex}><PrimaryButton label="이전" tone="light" onPress={() => setStep(1)} /></View>
                <View style={styles.actionWide}><PrimaryButton label={compareMutation.isPending ? "산출 중…" : "견적 산출"} icon="calculate" tone="dark" onPress={runComparison} disabled={compareMutation.isPending} /></View>
              </View>
            </View>
          ) : null}

          {step === 3 && compareResults ? (
            <View style={styles.sectionGap}>
              <PageHeader
                eyebrow="STEP 04 · COMPARE"
                title="캐피탈사별 견적을 비교하세요"
                description="가장 낮은 월 납입금에 표시가 붙습니다. 고객에게 전달할 하나를 선택하세요."
              />
              {(() => {
                const lowest = compareResults.reduce((min, entry) =>
                  entry.result.monthlyPayment < min.result.monthlyPayment ? entry : min,
                );
                return compareResults
                  .slice()
                  .sort((a, b) => a.result.monthlyPayment - b.result.monthlyPayment)
                  .map((entry) => (
                    <Card key={entry.company} style={styles.compareCard}>
                      <View style={styles.compareTop}>
                        <Text style={[styles.compareCompany, { color: colors.text }]}>{CAPITAL_LABELS[entry.company]}</Text>
                        {entry.company === lowest.company ? (
                          <View style={[styles.lowestBadge, { backgroundColor: colors.success }]}>
                            <Text style={styles.lowestBadgeText}>최저가</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={[styles.compareMonthly, { color: colors.text }]}>월 {formatKrw(entry.result.monthlyPayment)}</Text>
                      <View style={styles.compareMetrics}>
                        <Text style={[styles.compareMetric, { color: colors.muted }]}>초기비용 {formatKrw(entry.result.upfrontCost)}</Text>
                        <Text style={[styles.compareMetric, { color: colors.muted }]}>잔존가치 {formatKrw(entry.result.residualValue)}</Text>
                      </View>
                      <PrimaryButton
                        label="이 조건으로 선택"
                        icon="check-circle"
                        tone={entry.company === lowest.company ? "dark" : "light"}
                        onPress={() => void selectCompany(entry)}
                      />
                    </Card>
                  ));
              })()}
              <PrimaryButton label="조건 다시 조정" tone="light" onPress={() => setStep(2)} />
            </View>
          ) : null}

          {step === 4 && result && selectedCompany ? (
            <View style={styles.sectionGap}>
              <PageHeader
                eyebrow="STEP 05 · COMPLETE"
                title="고객용 견적이 완성되었습니다"
                description="금액과 안내 문구를 확인한 뒤 복사하거나 바로 공유하세요."
              />
              <View ref={quoteCardRef} collapsable={false} style={styles.quoteCard}>
                <View style={styles.quoteBrandRow}>
                  <View style={styles.quoteBrandMark}><Text style={styles.quoteBrandText}>U</Text></View>
                  <Text style={styles.quoteBrandName}>UNIDIA</Text>
                  <Text style={styles.quoteDate}>{new Intl.DateTimeFormat("ko-KR").format(new Date(result.generatedAt))}</Text>
                </View>
                <Text style={styles.quoteVehicle}>{vehicleName}</Text>
                <Text style={styles.quoteMeta}>{PRODUCT_LABELS[conditions.productType]} · {CAPITAL_LABELS[selectedCompany]} · {vehicle.contractMonths}개월</Text>
                <View style={styles.monthlyBlock}>
                  <Text style={styles.monthlyLabel}>예상 월 납입금</Text>
                  <Text style={styles.monthlyAmount}>{formatKrw(result.monthlyPayment)}</Text>
                </View>
                <View style={styles.quoteMetrics}>
                  <View style={styles.quoteMetric}><Text style={styles.metricLabel}>초기비용</Text><Text style={styles.metricValue}>{formatKrw(result.upfrontCost)}</Text></View>
                  <View style={styles.quoteMetric}><Text style={styles.metricLabel}>만기 잔존가치</Text><Text style={styles.metricValue}>{formatKrw(result.residualValue)}</Text></View>
                </View>
                <Text style={styles.legalText}>본 견적은 상담용 예상 시뮬레이션이며 실제 심사, 금리, 세금, 보험 및 출고 조건에 따라 달라질 수 있습니다.</Text>
              </View>

              <Card style={styles.messageCard}>
                <View style={styles.messageHeader}>
                  <Text style={[styles.groupTitle, { color: colors.text }]}>자동 생성 발송 문구</Text>
                  <MaterialIcons name="auto-awesome" size={18} color={colors.tint} />
                </View>
                <Text selectable style={[styles.messageText, { color: colors.muted }]}>{result.message}</Text>
              </Card>
              {notice ? <Text style={[styles.notice, { color: colors.success }]}>{notice}</Text> : null}
              <View style={styles.actionRow}>
                <View style={styles.actionFlex}><PrimaryButton label="문구 복사" icon="content-copy" tone="light" onPress={copyMessage} /></View>
                <View style={styles.actionFlex}><PrimaryButton label="견적 공유" icon="ios-share" onPress={shareQuote} /></View>
              </View>
              <PrimaryButton label="최종 확정 및 저장" icon="task-alt" tone="dark" onPress={completeQuote} />
              <PrimaryButton label="다른 캐피탈사 다시 보기" tone="light" onPress={() => setStep(3)} />
              <PrimaryButton label="조건 다시 조정" tone="light" onPress={() => setStep(2)} />
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 18, paddingBottom: 34 },
  sectionGap: { gap: 14 },
  progressWrap: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4, gap: 8 },
  progressTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  progressLabel: { fontSize: 12, lineHeight: 17, fontWeight: "900", letterSpacing: 0.3 },
  progressPercent: { fontSize: 12, lineHeight: 17, fontWeight: "700" },
  progressTrack: { height: 4, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: 4, borderRadius: 2 },
  compareCard: { gap: 10 },
  compareTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  compareCompany: { fontSize: 16, lineHeight: 22, fontWeight: "900" },
  lowestBadge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 },
  lowestBadgeText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  compareMonthly: { fontSize: 22, lineHeight: 28, fontWeight: "900" },
  compareMetrics: { flexDirection: "row", gap: 14 },
  compareMetric: { fontSize: 12.5, fontWeight: "600" },
  uploadCard: { alignItems: "center", gap: 12, paddingVertical: 22 },
  uploadIcon: { width: 72, height: 72, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  previewImage: { width: "100%", height: 210, borderRadius: 14 },
  uploadTitle: { fontSize: 18, lineHeight: 24, fontWeight: "900" },
  uploadBody: { fontSize: 13, lineHeight: 20, textAlign: "center", maxWidth: 290 },
  notice: { textAlign: "center", fontSize: 13, lineHeight: 19, fontWeight: "700" },
  formCard: { gap: 16 },
  confidenceRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  confidenceText: { fontSize: 13, fontWeight: "700" },
  twoColumns: { flexDirection: "row", gap: 10 },
  column: { flex: 1 },
  actionRow: { flexDirection: "row", gap: 10 },
  actionFlex: { flex: 1 },
  actionWide: { flex: 2 },
  groupTitle: { fontSize: 15, lineHeight: 21, fontWeight: "900" },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: "#DDE3EC" },
  summaryCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  summaryLabel: { fontSize: 12, lineHeight: 17, fontWeight: "700" },
  summaryValue: { fontSize: 20, lineHeight: 27, fontWeight: "900", marginTop: 3 },
  quoteCard: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "#DDE3EC" },
  quoteBrandRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  quoteBrandMark: { width: 28, height: 28, borderRadius: 8, backgroundColor: "#10233D", alignItems: "center", justifyContent: "center" },
  quoteBrandText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
  quoteBrandName: { color: "#10233D", fontSize: 13, fontWeight: "900", letterSpacing: 1.3, marginLeft: 8 },
  quoteDate: { marginLeft: "auto", color: "#657083", fontSize: 11, fontWeight: "600" },
  quoteVehicle: { color: "#132033", fontSize: 20, lineHeight: 27, fontWeight: "900" },
  quoteMeta: { color: "#657083", fontSize: 12, lineHeight: 18, marginTop: 4 },
  monthlyBlock: { backgroundColor: "#10233D", borderRadius: 16, padding: 18, marginTop: 18 },
  monthlyLabel: { color: "#B9C7DA", fontSize: 12, fontWeight: "700" },
  monthlyAmount: { color: "#FFFFFF", fontSize: 29, lineHeight: 38, fontWeight: "900", marginTop: 4 },
  quoteMetrics: { flexDirection: "row", gap: 10, marginTop: 10 },
  quoteMetric: { flex: 1, backgroundColor: "#F4F6FA", borderRadius: 12, padding: 12 },
  metricLabel: { color: "#657083", fontSize: 11, lineHeight: 16, fontWeight: "700" },
  metricValue: { color: "#132033", fontSize: 14, lineHeight: 20, fontWeight: "900", marginTop: 4 },
  legalText: { color: "#657083", fontSize: 9.5, lineHeight: 14, marginTop: 14 },
  messageCard: { gap: 12 },
  messageHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  messageText: { fontSize: 13, lineHeight: 21 },
});

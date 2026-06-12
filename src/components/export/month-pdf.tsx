import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { MonthData } from "@/lib/types";

const CATEGORY_FR: Record<string, string> = {
  LOYER: "Loyer",
  EPICERIE: "Épicerie",
  TRANSPORT: "Transport",
  SANTE: "Santé",
  LOISIRS: "Loisirs",
  RESTAURANTS: "Restaurants",
  VETEMENTS: "Vêtements",
  ABONNEMENTS: "Abonnements",
  ELECTRICITE: "Électricité",
  INTERNET: "Internet",
  ASSURANCE: "Assurance",
  ENTRETIEN: "Entretien",
  DIVERS: "Divers",
};

const TYPE_FR: Record<string, string> = {
  FIXED: "Fixe",
  VARIABLE: "Variable",
};

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#111",
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: "#2563eb",
    paddingBottom: 10,
  },
  title: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: "#2563eb",
    textTransform: "capitalize",
  },
  subtitle: {
    fontSize: 10,
    color: "#6b7280",
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginTop: 16,
    marginBottom: 6,
    color: "#1e40af",
    borderBottomWidth: 1,
    borderBottomColor: "#bfdbfe",
    paddingBottom: 3,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
    padding: "4 8",
    backgroundColor: "#f8fafc",
  },
  summaryLabel: { color: "#374151" },
  summaryValue: { fontFamily: "Helvetica-Bold" },
  summaryValueGreen: { fontFamily: "Helvetica-Bold", color: "#16a34a" },
  summaryValueRed: { fontFamily: "Helvetica-Bold", color: "#dc2626" },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#1e40af",
    padding: "4 6",
    marginBottom: 1,
  },
  tableHeaderText: {
    color: "#fff",
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
  },
  tableRow: {
    flexDirection: "row",
    padding: "3 6",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  tableRowAlt: {
    flexDirection: "row",
    padding: "3 6",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
  },
  colCategory: { width: "20%" },
  colLabel: { width: "35%" },
  colAmount: { width: "20%", textAlign: "right" },
  colType: { width: "15%" },
  colPaidBy: { width: "10%", textAlign: "right" },
  colMember: { width: "40%" },
  colGross: { width: "20%", textAlign: "right" },
  colDeduction: { width: "20%", textAlign: "right" },
  colNet: { width: "20%", textAlign: "right" },
  colShare: { width: "15%", textAlign: "right" },
  colExpected: { width: "20%", textAlign: "right" },
  colDeposited: { width: "20%", textAlign: "right" },
  colBalance: { width: "20%", textAlign: "right" },
  footer: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 8,
    color: "#9ca3af",
    fontSize: 8,
    textAlign: "center",
  },
});

function formatCurrency(n: number) {
  return `${n.toFixed(2)} $`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-CA");
}

function monthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat("fr-CA", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1));
}

interface Props {
  data: MonthData;
}

export function MonthPDF({ data }: Props) {
  const effortRatio =
    data.totalRevenues > 0
      ? ((data.totalExpenses / data.totalRevenues) * 100).toFixed(1)
      : "—";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Rapport — {monthLabel(data.year, data.month)}</Text>
          <Text style={styles.subtitle}>
            Généré le {new Date().toLocaleDateString("fr-CA")}
          </Text>
        </View>

        {/* Résumé */}
        <Text style={styles.sectionTitle}>Résumé du mois</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total revenus</Text>
          <Text style={styles.summaryValueGreen}>{formatCurrency(data.totalRevenues)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total dépenses</Text>
          <Text style={styles.summaryValueRed}>{formatCurrency(data.totalExpenses)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Taux d'effort</Text>
          <Text style={styles.summaryValue}>{effortRatio}%</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Solde (revenus - dépenses)</Text>
          <Text
            style={
              data.totalRevenues - data.totalExpenses >= 0
                ? styles.summaryValueGreen
                : styles.summaryValueRed
            }
          >
            {formatCurrency(data.totalRevenues - data.totalExpenses)}
          </Text>
        </View>

        {/* Dépenses */}
        <Text style={styles.sectionTitle}>Dépenses ({data.expenses.length})</Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, styles.colCategory]}>Catégorie</Text>
          <Text style={[styles.tableHeaderText, styles.colLabel]}>Description</Text>
          <Text style={[styles.tableHeaderText, styles.colAmount]}>Montant</Text>
          <Text style={[styles.tableHeaderText, styles.colType]}>Type</Text>
          <Text style={[styles.tableHeaderText, styles.colPaidBy]}>Payé par</Text>
        </View>
        {data.expenses.map((e, i) => (
          <View key={e.id} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
            <Text style={styles.colCategory}>{CATEGORY_FR[e.category] ?? e.category}</Text>
            <Text style={styles.colLabel}>{e.label}</Text>
            <Text style={styles.colAmount}>{formatCurrency(e.amount)}</Text>
            <Text style={styles.colType}>{TYPE_FR[e.type] ?? e.type}</Text>
            <Text style={styles.colPaidBy}>{e.paidByName ?? "—"}</Text>
          </View>
        ))}

        {/* Paies */}
        <Text style={styles.sectionTitle}>Revenus / Paies</Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, styles.colMember]}>Membre</Text>
          <Text style={[styles.tableHeaderText, styles.colGross]}>Brut</Text>
          <Text style={[styles.tableHeaderText, styles.colDeduction]}>Déductions</Text>
          <Text style={[styles.tableHeaderText, styles.colNet]}>Net</Text>
        </View>
        {data.paychecks.map((p, i) => (
          <View key={p.id} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
            <Text style={styles.colMember}>
              {p.displayName} — {formatDate(p.date)}
            </Text>
            <Text style={styles.colGross}>{formatCurrency(p.grossAmount)}</Text>
            <Text style={styles.colDeduction}>{formatCurrency(p.vacationDeduction)}</Text>
            <Text style={styles.colNet}>{formatCurrency(p.netAmount)}</Text>
          </View>
        ))}

        {/* Contributions */}
        <Text style={styles.sectionTitle}>Répartition & dépôts</Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, styles.colMember]}>Membre</Text>
          <Text style={[styles.tableHeaderText, styles.colShare]}>Part %</Text>
          <Text style={[styles.tableHeaderText, styles.colExpected]}>Attendu</Text>
          <Text style={[styles.tableHeaderText, styles.colDeposited]}>Déposé</Text>
          <Text style={[styles.tableHeaderText, styles.colBalance]}>Solde</Text>
        </View>
        {data.contributions.map((c, i) => (
          <View key={c.userId} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
            <Text style={styles.colMember}>{c.displayName}</Text>
            <Text style={styles.colShare}>{(c.share * 100).toFixed(1)}%</Text>
            <Text style={styles.colExpected}>{formatCurrency(c.expectedContribution)}</Text>
            <Text style={styles.colDeposited}>{formatCurrency(c.totalDeposited)}</Text>
            <Text
              style={[
                styles.colBalance,
                c.paymentBalance >= 0 ? { color: "#16a34a" } : { color: "#dc2626" },
              ]}
            >
              {c.paymentBalance >= 0 ? "+" : ""}
              {formatCurrency(c.paymentBalance)}
            </Text>
          </View>
        ))}

        {/* Footer */}
        <Text style={styles.footer}>
          Foyer — Rapport généré automatiquement • {monthLabel(data.year, data.month)}
        </Text>
      </Page>
    </Document>
  );
}

export interface UpcomingTask {
  id: string;
  dateMonth: string; // "OCT"
  dateDay: string;   // "04"
  title: string;     // "Complete evidence review"
  subtitle: string;  // "TechNova Solutions - Control GCRAI-023"
  priority: "High" | "Medium" | "Low";
}

export interface ActivityEvent {
  id: string;
  type: "evidence" | "assessment" | "finding" | "report" | "registration";
  title: string;       // "Evidence uploaded"
  description: string; // "ABC Corporation - Control GCRAI-001"
  timestamp: string;   // "2 hours ago"
}

export interface MonthlyTrendDataPoint {
  month: string;       // "Apr", "May", "Jun", "Jul", "Aug", "Sep"
  completed: number;
  inProgress: number;
  notStarted: number;
}

export interface PillarScoreData {
  pillarId: string;
  pillarNumber: number;
  name: string;
  completionPercentage: number;
}

export interface AuditorDashboardData {
  stats: {
    totalAssessments: number;
    inProgressAssessments: number;
    completedAssessments: number;
    totalFindings: number;
    assignedOrganizations: number;
  };
  overallCompletionPercentage: number;
  pillarPerformance: PillarScoreData[];
  assessmentTypes: {
    total: number;
    fullCount: number;
    fullPercentage: number;
    lightCount: number;
    lightPercentage: number;
  };
  monthlyTrends: MonthlyTrendDataPoint[];
  upcomingTasks: UpcomingTask[];
  recentActivity: ActivityEvent[];
  myOrganizations: {
    _id: string;
    name: string;
    industry: string;
    assessmentsCount: number;
    status: "In Progress" | "Completed" | "Not Started";
  }[];
  latestFindings: {
    id: string;
    organization: string;
    severity: "High" | "Medium" | "Low";
    status: "Open" | "In Review" | "Resolved";
  }[];
}

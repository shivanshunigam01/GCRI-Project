export interface AuditorDashboardSummary {
  assignedOrganizationsCount: number;
  inProgressAssessmentsCount: number;
  completedAssessmentsCount: number;
  upcomingRemediationsCount: number;
  recentAssessments: any[];
  pillarProgress: {
    pillarId: string;
    pillarName: string;
    completedQuestions: number;
    totalQuestions: number;
    completionPercentage: number;
  }[];
}

export interface AdminDashboardSummary {
  totalOrganizations: number;
  activeAssessors: number;
  totalAssessmentsConducted: number;
  tierDistribution: {
    bronze: number;
    silver: number;
    gold: number;
  };
  recentActivity: any[];
}

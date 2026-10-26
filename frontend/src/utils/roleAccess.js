export const ROUTE_ROLES = {
    dashboard: ['Admin', 'ProjectManager', 'SiteEngineer', 'StoreManager'],
    projects: ['Admin', 'ProjectManager', 'SiteEngineer'],
    stages: ['Admin', 'ProjectManager', 'SiteEngineer'],
    progress: ['Admin', 'ProjectManager', 'SiteEngineer'],
    materials: ['Admin', 'StoreManager'],
    workers: ['Admin', 'ProjectManager'],
    attendance: ['Admin', 'ProjectManager', 'SiteEngineer'],
    equipment: ['Admin', 'ProjectManager', 'SiteEngineer'],
    expenses: ['Admin', 'ProjectManager', 'SiteEngineer'],
    budget: ['Admin', 'ProjectManager'],
    reports: ['Admin', 'ProjectManager'],
    'user-access': ['Admin'],
    settings: ['Admin', 'ProjectManager', 'SiteEngineer', 'StoreManager'],
};

export function getHomePath() {
    return '/dashboard';
}

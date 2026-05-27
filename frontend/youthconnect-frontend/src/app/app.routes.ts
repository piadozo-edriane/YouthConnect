import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';
import { guestGuard } from './guards/guest.guard';

export const routes: Routes = [

    // Public Website Routing
    {
        path: '',
        loadComponent: () =>
            import('./pages/landing-page/landing-page').
                then(move => move.LandingPage),
        title: 'YouthConnect'
    },

    {
        path: 'about',
        loadComponent: () =>
            import('./pages/redirect/about-redirect').then(move => move.AboutRedirect),
        title: 'About Us - YouthConnect'
    },

    {
        path: 'leaders',
        loadComponent: () =>
            import('./pages/redirect/leaders-redirect').then(move => move.LeadersRedirect),
        title: 'Leaders - YouthConnect'
    },

    {
        path: 'projects',
        loadComponent: () =>
            import('./pages/redirect/projects-redirect').then(move => move.ProjectsRedirect),
        title: 'Projects - YouthConnect'
    },


    // Authentication Routes
    {
        path: 'login',
        loadComponent: () =>
            import('./pages/login-page/login-page').then(move => move.LoginPage),
        title: 'Login - YouthConnect',
        canActivate: [guestGuard]
    },

    // Administrator Login Route
    {
        path: 'administrator/login',
        loadComponent: () =>
            import('./pages/administrator-page/adminstrator-login/adminstrator-login').then(move => move.AdminstratorLogin),
        title: 'Administrator Login - YouthConnect',
        canActivate: [guestGuard]
    },

    // SK Official Login Route
    {
        path: 'sk-official/login',
        loadComponent: () =>
            import('./pages/sk-official-page/sk-official-login/sk-official-login').then(move => move.SkOfficialLogin),
        title: 'SK Official Login - YouthConnect',
        canActivate: [guestGuard]
    },

    {
        path: 'sign-up',
        loadComponent: () =>
            import('./pages/sign-up-page/sign-up-page').then(move => move.SignUpPage),
        title: 'Sign Up - YouthConnect',
        canActivate: [guestGuard]
    },

    // Forgot Password Routes
    {
        path: 'forgot-password',
        loadComponent: () =>
            import('./pages/forgot-password/forgot-password').then(move => move.ForgotPasswordPage),
        title: 'Forgot Password - YouthConnect',
        canActivate: [guestGuard]
    },

    {
        path: 'reset-password',
        loadComponent: () =>
            import('./pages/reset-password/reset-password').then(move => move.ResetPasswordPage),
        title: 'Reset Password - YouthConnect',
        canActivate: [guestGuard]
    },

    {
        path: 'sk-official/forgot-password',
        loadComponent: () =>
            import('./pages/sk-official-page/sk-forgot-password/sk-forgot-password').then(move => move.SkForgotPasswordPage),
        title: 'SK Official Forgot Password - YouthConnect',
        canActivate: [guestGuard]
    },

    {
        path: 'sk-official/reset-password',
        loadComponent: () =>
            import('./pages/sk-official-page/sk-reset-password/sk-reset-password').then(move => move.SkResetPasswordPage),
        title: 'SK Official Reset Password - YouthConnect',
        canActivate: [guestGuard]
    },


    // User Role Youth Routes
    {
        path: 'youth',
        canActivate: [authGuard, roleGuard],
        data: { roles: ['youth'] },
        loadComponent: () =>
            import('./pages/youth-user-page/layout/youth-layout/youth-layout').then(m => m.YouthLayout),
        children: [
            {
                path: 'dashboard',
                loadComponent: () =>
                    import('./pages/youth-user-page/dashboard/dashboard').then(move => move.Dashboard),
                title: 'Dashboard - YouthConnect'
            },
            {
                path: 'create-concern',
                loadComponent: () =>
                    import('./pages/youth-user-page/create-concern/create-concern').then(move => move.CreateConcern),
                title: 'Create Concern - YouthConnect'
            },
            {
                path: 'concern/:concernId',
                loadComponent: () =>
                    import('./pages/youth-user-page/youth-concern-detail/youth-concern-detail').then(m => m.YouthConcernDetail),
                title: 'Concern Details - YouthConnect'
            },
            {
                path: 'events',
                loadComponent: () =>
                    import('./pages/youth-user-page/event/event').then(move => move.EventPage),
                title: 'Events - YouthConnect'
            },
            {
                path: 'notifications',
                loadComponent: () =>
                    import('./pages/youth-user-page/notification/notification').then(move => move.NotificationPage),
                title: 'Notifications - YouthConnect'
            },
            {
                path: 'concerns/:concernId',
                loadComponent: () =>
                    import('./pages/youth-user-page/create-concern/create-concern').then(move => move.CreateConcern),
                title: 'Concern - YouthConnect'
            },
            {
                path: '', redirectTo: 'dashboard', pathMatch: 'full'
            },

        ],
    },

    // SK Official Routes
    {
        path: 'sk-official',
        canActivate: [authGuard, roleGuard],
        data: { roles: ['sk-official'] },
        loadComponent: () => import('./pages/sk-official-page/sk-official-layout/sk-official-layout').then(m => m.SkOfficialLayout),
        children: [
            {
                path: 'dashboard',
                loadComponent: () =>
                    import('./pages/sk-official-page/dashboard/dashboard').then(move => move.Dashboard),
                title: 'SK Official Dashboard - YouthConnect'
            },
            {
                path: 'events',
                loadComponent: () =>
                    import('./pages/sk-official-page/event-details/events/events.component').then(m => m.EventsComponent),
                title: 'SK Official Events - YouthConnect'
            },
            {
                path: 'events/:eventId',
                loadComponent: () =>
                    import('./pages/sk-official-page/event-details/event-details').then(m => m.EventDetailsPage),
                title: 'Event Details - YouthConnect'
            },
            {
                path: 'concerns',
                loadComponent: () =>
                    import('./pages/sk-official-page/concerns/concerns').then(move => move.Concerns),
                title: 'Concerns - YouthConnect'
            },
            {
                path: 'concerns/update/:concernId',
                loadComponent: () =>
                    import('./pages/sk-official-page/update-concern/update-concern').then(move => move.UpdateConcern),
                title: 'Update Concern - YouthConnect'
            },
            {
                path: 'youth-profiling',
                loadComponent: () =>
                    import('./pages/sk-official-page/youth-profiling/youth-profiling').then(move => move.YouthProfiling),
                title: 'Youth Profiling - YouthConnect'
            },
            {
                path: 'task-tracker',
                loadComponent: () =>
                    import('./pages/sk-official-page/task-tracker/task-tracker').then(move => move.TaskTracker),
                title: 'Task Tracker - YouthConnect'
            },
            {
                path: '', redirectTo: 'dashboard', pathMatch: 'full'
            },

        ],
    },

    // Admin Routes
    {
        path: 'admin',
        canActivate: [authGuard, roleGuard],//comment this for development
        data: { roles: ['admin'] },
        loadComponent: () =>
            import('./pages/administrator-page/layout/administrator-layout/administrator-layout').then(m => m.AdministratorLayout),
        children: [
            {
                path: 'dashboard',
                loadComponent: () =>
                    import('./pages/administrator-page/administrator-dashboard/administrator-dashboard').then(move => move.AdministratorDashboard),
                title: 'Admin Dashboard - YouthConnect'
            },
            {
                path: 'backup-restore',
                loadComponent: () =>
                    import('./pages/administrator-page/backup-restore/backup-restore').then(move => move.BackupRestore),
                title: 'Backup & Restore - YouthConnect'
            },
            {
                path: 'manage-sk-official',
                loadComponent: () =>
                    import('./pages/administrator-page/manage-sk-officials/manage-sk-officials').then(move => move.ManageSkOfficials),
                title: 'Manage SK Officials - YouthConnect'
            },
            {
                path: 'manage-sk-officials',
                loadComponent: () =>
                    import('./pages/administrator-page/manage-sk-officials/manage-sk-officials').then(move => move.ManageSkOfficials),
                title: 'Manage SK Officials - YouthConnect'
            },
            {
                path: 'manage-youth-member',
                loadComponent: () =>
                    import('./pages/administrator-page/manage-youth-member/manage-youth-member').then(move => move.ManageYouthMember),
                title: 'Manage Youth Members - YouthConnect'
            },
            {
                path: 'system-control',
                loadComponent: () =>
                    import('./pages/administrator-page/system-control/system-control').then(move => move.SystemControl),
                title: 'System Control - YouthConnect'
            },
            {
                path: 'system-statistics',
                loadComponent: () =>
                    import('./pages/administrator-page/system-statistics/system-statistics').then(move => move.SystemStatistics),
                title: 'System Statistics - YouthConnect'
            },
            {
                path: 'manage-administrator',
                loadComponent: () =>
                    import('./pages/administrator-page/manage-administrator/manage-administrator').then(move => move.ManageAdministrator),
                title: 'Manage Administrators - YouthConnect'
            },
            {
                path: '', redirectTo: 'dashboard', pathMatch: 'full'
            },
        ],
    },

    // Wildcard route for 404 - must be last
    {
        path: '**',
        redirectTo: '',
        pathMatch: 'full'
    }

];



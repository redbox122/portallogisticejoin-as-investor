import React from 'react';
import { Outlet } from 'react-router-dom';

/** Parent for `/admin/users` nested routes (list index + `:userId/show` + `:userId/update`). */
const AdminUsersSection = () => (
  <div className="admin-users-section">
    <Outlet />
  </div>
);

export default AdminUsersSection;

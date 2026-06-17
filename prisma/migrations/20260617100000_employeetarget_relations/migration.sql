-- AddForeignKey: EmployeeTarget → EmployeeProfile
ALTER TABLE `employee_target` ADD CONSTRAINT `employee_target_employeeProfileId_fkey`
  FOREIGN KEY (`employeeProfileId`) REFERENCES `EmployeeProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: EmployeeTarget → KRATemplate
ALTER TABLE `employee_target` ADD CONSTRAINT `employee_target_templateId_fkey`
  FOREIGN KEY (`templateId`) REFERENCES `kra_template`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

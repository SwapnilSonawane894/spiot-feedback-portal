/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Script to add staff members to the database
 * Run with: npx tsx scripts/add-staff.ts
 */

const staffData = [
  { name: "Mrs. Bhosale S. S.", email: "bhosale@gmail.com", password: "bhosale" },
  { name: "Mrs. Raut D. A", email: "raut@gmail.com", password: "raut" },
  { name: "Ms. Rajwade V. V", email: "rajwade@gmail.com", password: "rajwade" },
  { name: "Ms. Wagh S. S.", email: "wagh@gmail.com", password: "wagh" },
  { name: "Mr. Kadam R. C.", email: "kadam@gmail.com", password: "kadam" },
  { name: "Ms. Kamble P. D.", email: "kamble@gmail.com", password: "Kamble" },
];

async function addStaff() {
  console.log("Adding staff members...");
  
  // First, get the list of departments
  const deptResponse = await fetch("http://localhost:5000/api/departments");
  const departments = await deptResponse.json();
  
  if (!departments || departments.length === 0) {
    console.error("No departments found. Please create departments first.");
    return;
  }
  
  console.log("\nAvailable departments:");
  departments.forEach((dept: any, index: number) => {
    console.log(`${index + 1}. ${dept.name} (${dept.abbreviation})`);
  });
  
  // For this script, we'll assign all staff to the first department
  // In production, you'd want to specify which department each staff belongs to
  const defaultDepartmentId = departments[0].id;
  console.log(`\nAssigning all staff to: ${departments[0].name}\n`);
  
  for (const staff of staffData) {
    try {
      const response = await fetch("http://localhost:5000/api/staff", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Note: This will need authentication in production
          // You'll need to add authentication headers here
        },
        body: JSON.stringify({
          name: staff.name,
          email: staff.email,
          password: staff.password,
          departmentId: defaultDepartmentId,
          employeeId: "",
          designation: "Faculty",
        }),
      });
      
      if (response.ok) {
        console.log(`✓ Added: ${staff.name}`);
      } else {
        const error = await response.json();
        console.error(`✗ Failed to add ${staff.name}: ${error.error}`);
      }
    } catch (error) {
      console.error(`✗ Error adding ${staff.name}:`, error);
    }
  }
  
  console.log("\nStaff addition complete!");
}

addStaff().catch(console.error);

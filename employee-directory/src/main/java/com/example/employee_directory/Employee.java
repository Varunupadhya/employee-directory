package com.example.employee_directory;

import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbPartitionKey;

@DynamoDbBean
public class Employee {

    private String employeeId;
    private String name;
    private String email;
    private String department;
    private String role;

    public Employee() {
    }

    public Employee(String employeeId, String name, String email, String department, String role) {
        this.employeeId = employeeId;
        this.name = name;
        this.email = email;
        this.department = department;
        this.role = role;
    }

    @DynamoDbPartitionKey
    public String getEmployeeId() {
        return employeeId;
    }

    public void setEmployeeId(String employeeId) {
        this.employeeId = employeeId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

	public String getEmail() {
        return email;
    }

	public void setEmail(String email) {
        this.email = email;
    }

    public String getDepartment() {
        return department;
    }

	public void setDepartment(String department) {
        this.department = department;
    }

    public String getRole() {
        return role;
    }

	public void setRole(String role) {
        this.role = role;
    }
}
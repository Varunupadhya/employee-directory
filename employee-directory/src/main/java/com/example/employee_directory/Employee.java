package com.example.employee_directory;

public class Employee {

    private int id;
    private String name;
    private String role;
    private String department;
    private String email;

    public Employee(int id, String name, String role, String department, String email) {
        this.id = id;
        this.name = name;
        this.role = role;
        this.department = department;
        this.email = email;
    }

    public int getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getRole() {
        return role;
    }

    public String getDepartment() {
        return department;
    }

    public String getEmail() {
        return email;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public void setEmail(String email) {
        this.email = email;
    }
}
package com.example.employee_directory;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.ArrayList;
import java.util.List;

@Controller
public class EmployeeController {

    private final List<Employee> employees = new ArrayList<>();
    private int nextId = 4;

    public EmployeeController() {
        employees.add(new Employee(
                1,
                "Varun",
                "Cloud Engineer",
                "AWS",
                "varun@example.com"
        ));

        employees.add(new Employee(
                2,
                "Rahul",
                "Java Developer",
                "Engineering",
                "rahul@example.com"
        ));

        employees.add(new Employee(
                3,
                "Priya",
                "DevOps Engineer",
                "Infrastructure",
                "priya@example.com"
        ));
    }

    @GetMapping("/")
    public String home(Model model) {
        model.addAttribute("employees", employees);
        model.addAttribute("totalEmployees", employees.size());
        return "index";
    }

    @PostMapping("/add")
    @ResponseBody
    public String addEmployee(@RequestBody EmployeeRequest request) {

        Employee employee = new Employee(
                nextId,
                request.getName(),
                request.getRole(),
                request.getDepartment(),
                request.getEmail()
        );

        employees.add(employee);
        nextId++;

        return "Employee added successfully";
    }

    @GetMapping("/delete/{id}")
    public String deleteEmployee(@PathVariable int id) {
        employees.removeIf(employee -> employee.getId() == id);
        return "redirect:/";
    }

    @GetMapping("/health")
    @ResponseBody
    public String health() {
        return "UP - Employee Directory Application is running successfully";
    }
}
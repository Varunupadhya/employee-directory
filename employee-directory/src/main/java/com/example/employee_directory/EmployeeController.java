package com.example.employee_directory;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.ResponseBody;

@Controller
public class EmployeeController {

    private final DynamoDbEmployeeService employeeService;

    public EmployeeController(DynamoDbEmployeeService employeeService) {
        this.employeeService = employeeService;
    }

    @GetMapping("/")
    public String home(Model model) {
        model.addAttribute("employees", employeeService.getAllEmployees());
        model.addAttribute("employeeRequest", new EmployeeRequest());
        model.addAttribute("editEmployee", null);

        return "index";
    }

    @PostMapping("/add")
    public String addEmployee(@ModelAttribute EmployeeRequest employeeRequest) {
        employeeService.addEmployee(employeeRequest);

        return "redirect:/";
    }

    @GetMapping("/edit/{employeeId}")
    public String editEmployee(@PathVariable String employeeId, Model model) {
        Employee employee = employeeService.getEmployeeById(employeeId);

        model.addAttribute("employees", employeeService.getAllEmployees());
        model.addAttribute("employeeRequest", new EmployeeRequest());
        model.addAttribute("editEmployee", employee);

        return "index";
    }

    @PostMapping("/update/{employeeId}")
    public String updateEmployee(
            @PathVariable String employeeId,
            @ModelAttribute EmployeeRequest employeeRequest
    ) {
        employeeService.updateEmployee(employeeId, employeeRequest);

        return "redirect:/";
    }

    @GetMapping("/delete/{employeeId}")
    public String deleteEmployee(@PathVariable String employeeId) {
        employeeService.deleteEmployee(employeeId);

        return "redirect:/";
    }

    @GetMapping("/health")
    @ResponseBody
    public String health() {
        return "OK";
    }
}
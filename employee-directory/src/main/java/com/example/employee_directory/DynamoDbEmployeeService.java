package com.example.employee_directory;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.Key;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;

@Service
public class DynamoDbEmployeeService {

    @Value("${aws.region}")
    private String awsRegion;

    @Value("${aws.dynamodb.table-name}")
    private String tableName;

    private DynamoDbTable<Employee> employeeTable;

    @PostConstruct
    public void initializeDynamoDbTable() {
        DynamoDbClient dynamoDbClient = DynamoDbClient.builder()
                .region(Region.of(awsRegion))
                .credentialsProvider(DefaultCredentialsProvider.create())
                .build();

        DynamoDbEnhancedClient enhancedClient = DynamoDbEnhancedClient.builder()
                .dynamoDbClient(dynamoDbClient)
                .build();

        this.employeeTable = enhancedClient.table(
                tableName,
                TableSchema.fromBean(Employee.class)
        );
    }

    public List<Employee> getAllEmployees() {
        List<Employee> employees = new ArrayList<>();

        employeeTable.scan()
                .items()
                .forEach(employees::add);

        return employees;
    }

    public Employee getEmployeeById(String employeeId) {
        Key key = Key.builder()
                .partitionValue(employeeId)
                .build();

        return employeeTable.getItem(key);
    }

    public void addEmployee(EmployeeRequest request) {
        Employee employee = new Employee(
                UUID.randomUUID().toString(),
                request.getName(),
                request.getEmail(),
                request.getDepartment(),
                request.getRole()
        );

        employeeTable.putItem(employee);
    }

    public void updateEmployee(String employeeId, EmployeeRequest request) {
        Employee existingEmployee = getEmployeeById(employeeId);

        if (existingEmployee != null) {
            existingEmployee.setName(request.getName());
            existingEmployee.setEmail(request.getEmail());
            existingEmployee.setDepartment(request.getDepartment());
            existingEmployee.setRole(request.getRole());

            employeeTable.putItem(existingEmployee);
        }
    }

    public void deleteEmployee(String employeeId) {
        Key key = Key.builder()
                .partitionValue(employeeId)
                .build();

        employeeTable.deleteItem(key);
    }
}
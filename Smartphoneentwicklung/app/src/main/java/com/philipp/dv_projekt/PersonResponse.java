package com.philipp.dv_projekt;

public class PersonResponse {
    public String Success;
    public Person message;

    public static class Person {
        public String lastname;
        public String firstname;
        public String sex;
        public String dateOfBirth;
        public String phoneNumber;
        public String emailAddress;
    }
}

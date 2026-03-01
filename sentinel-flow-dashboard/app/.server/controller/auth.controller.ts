import { data } from "react-router";
import { loginService, registerUserService } from "../services/auth.service";
import { createOrganizationService, getCountOrganizationsService } from "../services/organization.service";
import { Role } from "~/lib/types/role";
import type { BaseResponseDtoWithData, BaseResponseDtoWithErrors } from "~/lib/types/dto/base.dto";

export async function registerRoot(organizationName: string, email: string, password: string, confirmPassword: string) {
    const errors = [];

    if (!organizationName || organizationName == "") {
        errors.push("Organization name is required");
    }
    if (!email || email == "") {
        errors.push("Email is required");
    }
    if (
        email &&
        !email.toString().includes("@") && // Must contains @
        !email.toString().includes(".") // Must contains .
    ) {
        errors.push("Email must be a valid email address");
    }
    if (!password || password == "") {
        errors.push("Password is required");
    }
    if (!confirmPassword || confirmPassword == "") {
        errors.push("Confirm password is required");
    }
    if (password !== confirmPassword) {
        errors.push("Passwords and confirm passwords do not match");
    }
    if (errors.length > 0) {
        return data({
            errors: errors,
            status: 400,
            success: false
        } as BaseResponseDtoWithErrors, { status: 400 });
    }

    const countOrganizations = await getCountOrganizationsService();
    if (countOrganizations > 0) {
        return data({
            errors: ["Administrator account already exists"],
            status: 400,
            success: false,
        } as BaseResponseDtoWithErrors, { status: 400 });
    }

    const organization = await createOrganizationService(organizationName.toString());
    if (!organization) {
        return data({
            errors: ["Failed to create organization"],
            status: 500,
            success: false,
        } as BaseResponseDtoWithErrors, { status: 500 });
    }
    const user = await registerUserService(
        email.toString(),
        password.toString(),
        Role.ROOT
    );

    if (!user) {
        return data({
            errors: ["Failed to create user"],
            status: 500,
            success: false,
        } as BaseResponseDtoWithErrors, { status: 500 });
    }

    return data({
        data: {
            organization: organization.organizationName,
            email: user.email,
        },
        status: 201,
        success: true,
    } as BaseResponseDtoWithData<{
        organization: string;
        email: string;
    }>, { status: 201 });
}

export async function login(email: string, password: string) {
    if (email != "" && password != "") {

        const user = await loginService(email, password);
        if (!user) {
            return {
                errors: ["Invalid email or password"],
                status: 404,
                success: false,
            } as BaseResponseDtoWithErrors;
        }
        return user;
    } else {
        return {
            errors: ["Email and password are required"],
            status: 400,
            success: false,
        } as BaseResponseDtoWithErrors;
    }
}
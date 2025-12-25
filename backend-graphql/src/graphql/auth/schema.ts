export const typeDefs = `
  type User {
    id: ID!
    email: String!
    first_name: String
    last_name: String
    role: String
    created_at: String
  }

  type AuthResponse {
    user: User!
    message: String
  }

  input LoginInput {
    email: String!
    password: String!
    rememberMe: Boolean
  }

  input RegisterInput {
    email: String!
    password: String!
    first_name: String
    last_name: String
  }

  extend type Mutation {
    login(input: LoginInput!): AuthResponse!
    register(input: RegisterInput!): AuthResponse!
    logout: Boolean!
  }

  extend type Query {
    me: User
  }
`;

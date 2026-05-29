# Security in cloud file repository

## Architecture Characteristics to prioritize

- Reliability
- Scalability
- Maintainability
- Security

## Context

LexCorp is in the process of developing a cloud-based file repository. The purpose of this repository is to securely store and share files with their clients. Multiple systems within LexCorp will be sending various types of documents to their clients, and this platform will serve as the central storage and distribution point for these files. The primary challenge lies in ensuring the secure storage of these files and controlling access to them. The users of this service are going to be apps. The apps are going to access the service using a client library responsible for authentication and authorization. The design and implementation of this library is part of the problem to solve — the team must identify a suitable authentication and authorization mechanism (e.g., API keys, OAuth2 client credentials, signed tokens) and implement it as a reusable library component. End users of those apps will be able to access the files using a REST API (or similar). The access provided to end users must have restrictions to prevent unauthorized file access.

## Problem to solve

The task at hand is to create a service that securely stores files in a cloud repository. This service must provide an API with the following capabilities:

1. **File Upload**: This feature allows users with the appropriate permissions to upload files to the repository. Upon successful upload, the service should return a unique file id.

2. **Link Generation**: This feature allows users with the appropriate permissions to generate a download link for a file using the file's id.

3. **File Download**: This feature allows any user to download a file using the generated link.It won't be part of the library API. However, the link should have enough restrictions to prevent unauthorized access.

## Scoring Parameters

| Characteristic  | Description                                                                                                                                                                                                        | Scoring Criteria                                                                                                                                                                                       |
|-----------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Reliability     | Ability of the system to consistently perform its intended or required function or mission, on demand and without degradation or failure.                                                                          | \- Always performs its intended function: 3 points<br>\- There are some scenarios where the system fails: 2 points<br>\- System frequently fails and doesn't recover by itself: 1 point                |
| Scalability     | Ability of the system to handle a growing amount of work by adding resources to the system.                                                                                                                        | \- Easily scalable to accommodate increased load: 3 points<br>\- Some scalability features, but with limitations: 2 points<br>\- Limited scalability, potential issues with increased load: 1 point    |
| Maintainability | Ease with which a product can be maintained in order to isolate defects or their cause, correct defects or their cause, meet new requirements, make future maintenance easier, or cope with a changed environment. | \- Well-documented code: 3 points<br>\- Modularity and clear structure (Single Responsibility pattern): 2 points<br>\- Lack of documentation or unclear structure: 1 point                             |
| Security        | Protect files from the access of third person/systems. Including tools to identify an attack.                                                                                                                      | \- Robust security measures in place: 3 points<br>\- Some security measures, but with potential vulnerabilities: 2 points<br>\- Limited or no security measures, high risk of vulnerabilities: 1 point |
## Anexes and References

![Architecture diagram](sources/diagrama-seguridad.png)

<!-- To regenerate this diagram, open the following URL and save the image as sources/diagrama-seguridad.png:
http://www.plantuml.com/plantuml/png/NP0_JyOW48Vt-nJt1HWAgp5L9nC7eoDXe2q32HPoK4rZ_ExsojlcfTlldeVS7_fSB9NbAu1-flYJ7Hcq6OUQGJ-b5FneYuypTWRPsPIwLiXJo5QeKoZGRtuWIwjX4ce6_U5IpBv4Ml7JqRSVtUvfmm2tBV1121vwgUMbLi2FK8Z7epqY8zaW9kgU01oAOHqCOuZBXB_RDU-lffxWNvZ1NxFMYO_0SE_HktdQllKV
-->
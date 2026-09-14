import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
} from 'typeorm';
import { v4 as createUuid } from 'uuid';
import { UserRole } from '../../common/enums/user-role.enum';

/**
 * Authenticated staff user who can manage appointments.
 */
@Entity({ name: 'users' })
export class User {
  @PrimaryColumn('uuid')
  id: string = createUuid();

  @Column({ unique: true })
  email!: string;

  @Column({ name: 'password_hash' })
  passwordHash!: string;

  @Column({ name: 'full_name' })
  fullName!: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.Advisor })
  role: UserRole = UserRole.Advisor;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

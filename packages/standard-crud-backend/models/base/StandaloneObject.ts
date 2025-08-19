/**
 * Base object for CRUD entities
 */
export interface StandaloneObject {
  /**
   * Unique identifier for the element. It's a read-only UUID generated upon item's registration
   * @label Id
   * @generator $uuid
   * @readonly yes
   */
  Id?: string;

  /**
   * UserID owning this item. This is equals to the IdentityId that the current user has in the system
   * @label entities.base.properties.UserId.label
   * @readonly yes
   * @cellType platform-user
   */
  UserId?: string;

  /**
   * Name for the entity. Human-readable name that identifies this entity
   * @label entities.base.properties.Name.label
   * @maxLength 64
   * @minLength 2
   * @pattern ^[a-zA-Z][a-zA-Z0-9 \-_:]+[a-zA-Z]$
   * @fieldType text
   */
  Name?: string;

  /**
   * Description for the entity.
   * @label entities.base.properties.Description.label
   * @maxLength 1024
   * @minLength 2
   * @fieldType textarea
   * @rows 4
   */
  Description?: string;

  /**
   * Creation date for this entity.
   * @readonly yes
   * @generator $formattedDate
   * @cellType date
   */
  CreatedAt?: Date | string;

  /**
   * Date this entity was last updated.
   * @readonly yes
   * @generator $formattedDate
   */
  UpdatedAt?: Date | string;

  /**
   * Date this entity was deleted
   * @readonly yes
   * @cellType date
   */
  DeletedAt?: Date | string;

  /**
   * Tags for this entity
   * @label Tags
   * @summary Tags help categorize entities
   */
  Tags?: string[];

  /**
   * Whether this object is public - i.e. accessible to all users
   * This is helpful for resources that need accessing by other users
   */
  IsPublic?: boolean;
}

export interface StandaloneReference {
  Id: string;
  UserId: string;
}
